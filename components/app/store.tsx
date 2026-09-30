"use client";

import * as React from "react";
import { currentUser as seedUser, users } from "@/data/app/seed";
import type {
  CaptureChannel,
  ClaimStatus,
  EvidenceKind,
  ReviewActionKind,
  Role,
  User,
} from "@/data/app/types";
import { seedSource, type DataSource } from "@/lib/app/selectors";
import {
  applyEvidenceAdds,
  initialPersistedState,
  type PersistedState,
  type StartServiceInput,
} from "@/lib/app/appState";
import {
  captureEvidence,
  startService as startServiceReducer,
} from "@/lib/app/services/serviceService";
import { submitReview as submitReviewReducer } from "@/lib/app/services/reviewService";

export type { EvidenceAdd, StartServiceInput } from "@/lib/app/appState";

const STORAGE_KEY = "selaras-app-v1";

type AppContextValue = {
  hydrated: boolean;
  state: PersistedState;
  src: DataSource;
  user: User;
  role: Role;
  unread: number;
  setRole: (role: Role) => void;
  startService: (input: StartServiceInput) => string;
  addEvidence: (
    serviceId: string,
    kind: EvidenceKind,
    channel?: CaptureChannel,
  ) => void;
  submitReview: (
    claimId: string,
    action: ReviewActionKind,
    note: string,
  ) => void;
  markAllRead: () => void;
  resetDemo: () => void;
  statusOf: (claimId: string, base: ClaimStatus) => ClaimStatus;
};

const AppContext = React.createContext<AppContextValue | null>(null);

let cacheState: PersistedState = initialPersistedState;
let cacheLoaded = false;
const listeners = new Set<() => void>();

function loadCache(): PersistedState {
  if (!cacheLoaded && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        cacheState = {
          ...initialPersistedState,
          ...(JSON.parse(raw) as Partial<PersistedState>),
        };
      }
    } catch {
      // storage tidak tersedia — pakai state awal
    }
    cacheLoaded = true;
  }
  return cacheState;
}

function getServerSnapshot(): PersistedState {
  return initialPersistedState;
}

function subscribeCache(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function commitCache(next: PersistedState) {
  cacheState = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // abaikan quota error
    }
  }
  listeners.forEach((l) => l());
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const state = React.useSyncExternalStore(
    subscribeCache,
    loadCache,
    getServerSnapshot,
  );
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

  const setState = React.useCallback(
    (updater: (prev: PersistedState) => PersistedState) => {
      commitCache(updater(loadCache()));
    },
    [],
  );

  const src = React.useMemo<DataSource>(() => {
    const base = [
      ...seedSource.services,
      ...state.createdServices,
    ].map((s) => applyEvidenceAdds(s, state.evidenceAdds));

    return {
      services: base,
      reviews:
        state.reviews.length > 0
          ? [...state.reviews, ...seedSource.reviews]
          : seedSource.reviews,
      audit:
        state.audit.length > 0
          ? [...state.audit, ...seedSource.audit]
          : seedSource.audit,
      notifications:
        state.notifications.length > 0
          ? [...state.notifications, ...seedSource.notifications]
          : seedSource.notifications,
    };
  }, [state]);

  const user = React.useMemo(
    () => users.find((u) => u.role === state.role) ?? seedUser,
    [state.role],
  );

  const unread = React.useMemo(
    () => src.notifications.filter((n) => !state.readIds.includes(n.id)).length,
    [src.notifications, state.readIds],
  );

  const startService = React.useCallback(
    (input: StartServiceInput): string => {
      let id = "";
      setState((prev) => {
        const result = startServiceReducer(prev, input, user.name);
        id = result.serviceId;
        return result.state;
      });
      return id;
    },
    [setState, user.name],
  );

  const addEvidence = React.useCallback(
    (serviceId: string, kind: EvidenceKind, channel?: CaptureChannel) => {
      setState((prev) =>
        captureEvidence(prev, serviceId, kind, user.name, channel) ?? prev,
      );
    },
    [setState, user.name],
  );

  const submitReview = React.useCallback(
    (claimId: string, action: ReviewActionKind, note: string) => {
      setState((prev) =>
        submitReviewReducer(prev, claimId, action, note, user.name),
      );
    },
    [setState, user.name],
  );

  const markAllRead = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      readIds: src.notifications.map((n) => n.id),
    }));
  }, [setState, src.notifications]);

  const resetDemo = React.useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // abaikan
    }
    setState(() => initialPersistedState);
  }, [setState]);

  const setRole = React.useCallback((role: Role) => {
    setState((prev) => ({ ...prev, role }));
  }, [setState]);

  const statusOf = React.useCallback(
    (claimId: string, base: ClaimStatus): ClaimStatus =>
      state.statusOverrides[claimId] ?? base,
    [state.statusOverrides],
  );

  const value = React.useMemo<AppContextValue>(
    () => ({
      hydrated,
      state,
      src,
      user,
      role: state.role,
      unread,
      setRole,
      startService,
      addEvidence,
      submitReview,
      markAllRead,
      resetDemo,
      statusOf,
    }),
    [
      hydrated,
      state,
      src,
      user,
      unread,
      setRole,
      startService,
      addEvidence,
      submitReview,
      markAllRead,
      resetDemo,
      statusOf,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp harus dipakai di dalam AppStoreProvider");
  return ctx;
}
