import {
  SyncSnapshot,
  SubmitActionsApplied,
  SeqConflict,
  LeaderboardData,
  MigrationResult,
  OfflineClaimResult,
} from '../../server/src/store/types';
import { MpTowerState } from '../shared/authority';

const API_BASE_URL = '/api';

export class MultiplayerApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'MultiplayerApiError';
  }
}

export async function loginGuest(deviceId: string): Promise<{ token: string; userId: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new MultiplayerApiError(
      err.code ?? 'auth_failed',
      err.message ?? 'Đăng nhập thất bại',
      res.status
    );
  }

  return res.json();
}

export async function fetchSync(token: string): Promise<SyncSnapshot> {
  const res = await fetch(`${API_BASE_URL}/sync`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new MultiplayerApiError(
      err.code ?? 'sync_failed',
      err.message ?? 'Đồng bộ thất bại',
      res.status
    );
  }

  return res.json();
}

export async function fetchLeaderboard(token?: string): Promise<LeaderboardData> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/leaderboard`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new MultiplayerApiError(
      err.code ?? 'leaderboard_failed',
      err.message ?? 'Không thể tải Bảng Phong Thần',
      res.status
    );
  }

  return res.json();
}

export async function sendCultivate(
  token: string,
  seq: number,
  n: number = 1,
  mode: 'auto' | 'manual' = 'manual'
): Promise<SubmitActionsApplied | SeqConflict> {
  const res = await fetch(`${API_BASE_URL}/actions/cultivate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ seq, n, mode }),
  });

  if (res.status === 409) {
    return res.json() as Promise<SeqConflict>;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new MultiplayerApiError(
      err.code ?? 'cultivate_failed',
      err.message ?? 'Khai đỉnh trực tuyến thất bại',
      res.status
    );
  }

  return res.json() as Promise<SubmitActionsApplied>;
}

export async function importLocalSave(token: string, rawSave: unknown): Promise<MigrationResult> {
  const res = await fetch(`${API_BASE_URL}/migration/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rawSave }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new MultiplayerApiError(
      err.code ?? 'migration_failed',
      err.message ?? 'Chuyển đổi dữ liệu lên máy chủ thất bại',
      res.status
    );
  }

  return res.json();
}

export async function claimServerOfflineReward(token: string): Promise<OfflineClaimResult> {
  const res = await fetch(`${API_BASE_URL}/offline/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new MultiplayerApiError(
      err.code ?? 'offline_claim_failed',
      err.message ?? 'Nhận thưởng bế quan ngoại tuyến thất bại',
      res.status
    );
  }

  return res.json();
}

export interface WebSocketCallbacks {
  token?: string;
  onConnected?: (onlineCount: number) => void;
  onTowerUpdate?: (
    tower: MpTowerState,
    onlineCount: number,
    recent?: { contributorName: string; exp: number }
  ) => void;
  onMilestone?: (milestone: { level: number; message: string; contributor: string }) => void;
  onPresence?: (onlineCount: number) => void;
}

export function connectMultiplayerWebSocket(callbacks: WebSocketCallbacks): () => void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const tokenParam = callbacks.token ? `?token=${encodeURIComponent(callbacks.token)}` : '';
  const wsUrl = `${protocol}//${window.location.host}/api/rt${tokenParam}`;

  let ws: WebSocket | null = null;
  let isClosed = false;
  let reconnectTimer: NodeJS.Timeout | null = null;

  function connect() {
    if (isClosed) return;
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') {
            callbacks.onConnected?.(data.onlineCount ?? 1);
          } else if (data.type === 'tower.update') {
            callbacks.onTowerUpdate?.(data.tower, data.onlineCount ?? 1, data.recentContribution);
          } else if (data.type === 'milestone') {
            callbacks.onMilestone?.({
              level: data.level,
              message: data.message,
              contributor: data.contributor,
            });
          } else if (data.type === 'presence') {
            callbacks.onPresence?.(data.onlineCount ?? 1);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!isClosed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    } catch {
      if (!isClosed) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    }
  }

  connect();

  return () => {
    isClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
}
