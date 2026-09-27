export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs < 10_000) {
    return sign + Math.floor(abs).toLocaleString('en-US');
  }
  if (abs < 1_000_000) {
    return `${sign}${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  if (abs < 1_000_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(2).replace(/\.00$/, '')}M`;
  }
  return `${sign}${(abs / 1_000_000_000).toFixed(2).replace(/\.00$/, '')}B`;
}

export function formatExactNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.floor(value).toLocaleString('en-US');
}

export function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  if (minutes > 0) {
    return `${minutes} phút ${seconds} giây`;
  }
  return `${seconds} giây`;
}
