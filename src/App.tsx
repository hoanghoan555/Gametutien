/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameShell } from './components/layout/GameShell';
import { GameProvider, useGameStore } from './stores/gameStore';
import { CharacterView } from './views/CharacterView';
import { HomeView } from './views/HomeView';
import { InventoryView } from './views/InventoryView';
import { SpiritBeastView } from './views/SpiritBeastView';

const ActiveViewRouter: React.FC = () => {
  const { activeTab } = useGameStore();

  switch (activeTab) {
    case 'character':
      return <CharacterView />;
    case 'inventory':
      return <InventoryView />;
    case 'beast':
      return <SpiritBeastView />;
    case 'tower':
    default:
      return <HomeView />;
  }
};

export default function App() {
  return (
    <GameProvider>
      <GameShell>
        <ActiveViewRouter />
      </GameShell>
    </GameProvider>
  );
}

