import React, { createContext, useContext } from 'react';

type Ctx = {
  openSidebar: () => void;
};

const AppUIContext = createContext<Ctx | null>(null);

export function AppUIProvider({ children, openSidebar }: { children: React.ReactNode; openSidebar: () => void }) {
  return <AppUIContext.Provider value={{ openSidebar }}>{children}</AppUIContext.Provider>;
}

export function useAppUI() {
  const v = useContext(AppUIContext);
  if (!v) throw new Error('useAppUI outside provider');
  return v;
}
