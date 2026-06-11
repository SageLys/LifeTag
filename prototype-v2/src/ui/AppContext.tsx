import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { createAppRuntime } from '../core/createAppRuntime';
import type { AppRuntime } from '../core/types';

interface AppContextValue {
  app: AppRuntime;
  tick: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [app] = useState(() => createAppRuntime());
  const [, setRevision] = useState(0);

  const tick = useCallback(() => setRevision(r => r + 1), []);

  return (
    <AppContext.Provider value={{ app, tick }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
