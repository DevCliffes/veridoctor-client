"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";

interface RecordsUnlockContextValue {
  isUnlocked: boolean;
  unlock: (token: string, expiresInSeconds: number) => void;
  lock: () => void;
  getUnlockToken: () => string | null;
}

const RecordsUnlockContext = createContext<RecordsUnlockContextValue | undefined>(
  undefined
);

export function RecordsUnlockProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = useCallback(() => {
    tokenRef.current = null;
    setIsUnlocked(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const unlock = useCallback(
    (token: string, expiresInSeconds: number) => {
      tokenRef.current = token;
      setIsUnlocked(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lock();
      }, expiresInSeconds * 1000);
    },
    [lock]
  );

  const getUnlockToken = useCallback(() => tokenRef.current, []);

  return (
    <RecordsUnlockContext.Provider value={{ isUnlocked, unlock, lock, getUnlockToken }}>
      {children}
    </RecordsUnlockContext.Provider>
  );
}

export function useRecordsUnlock() {
  const ctx = useContext(RecordsUnlockContext);
  if (!ctx) {
    throw new Error("useRecordsUnlock must be used within a RecordsUnlockProvider");
  }
  return ctx;
}
