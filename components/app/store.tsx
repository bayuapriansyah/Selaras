"use client";

import * as React from "react";
import {
  APP_TODAY,
  currentUser as seedUser,
  users,
} from "@/data/app/seed";
import { EVIDENCE_LABEL, EVIDENCE_ORDER } from "@/data/app/types";
import type {
  AuditEntry,
  ClaimStatus,
  EvidenceKind,
  EvidenceSource,
  Notification,
  ReviewAction,
  ReviewActionKind,
  Role,
  Service,
  User,
} from "@/data/app/types";
import { getTemplate, seedSource, type DataSource } from "@/lib/app/selectors";
import { REVIEW_LABEL } from "@/lib/app/actions";

const STORAGE_KEY = "selaras-app-v1";

export type EvidenceAdd = {
  serviceId: string;
  kind: EvidenceKind;
  at: string;
  source: EvidenceSource;
};

type Persisted = {
  role: Role;
  createdServices: Service[];
  evidenceAdds: EvidenceAdd[];
  statusOverrides: Record<string, ClaimStatus>;
  reviews: ReviewAction[];
  audit: AuditEntry[];
  notifications: Notification[];
  readIds: string[];
  nextSeq: number;
};

const initialState: Persisted = {
  role: "reviewer",
  createdServices: [],
  evidenceAdds: [],
  statusOverrides: {},
  reviews: [],
  audit: [],
  notifications: [],
  readIds: [],
  nextSeq: 1,
};

function clockHM(): string {
  return new Date().toTimeString().slice(0, 5);
}

function nowStamp(): string {
  return `${APP_TODAY} ${clockHM()}`;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
}

function applyAdds(service: Service, adds: EvidenceAdd[]): Service {
  const mine = adds.filter((a) => a.serviceId === service.id);
  if (mine.length === 0) return service;

  const required = getTemplate(service.templateId).required;
  let changed = false;

  const evidence = service.evidence.map((e) => {
    const add = mine.find((a) => a.kind === e.kind);
    if (!add || e.state === "present") return e;
    changed = true;
    return {
      ...e,
      state: "present" as const,
      at: add.at,
      source: add.source,
    };
  });

  const newEvents = mine
    .filter(
      (a) =>
        !service.events.some(
          (ev) => ev.id === `EV-${service.id}-${a.kind.toUpperCase()}`,
        ),
    )
    .map((a) => ({
      id: `EV-${service.id}-${a.kind.toUpperCase()}`,
      serviceId: service.id,
      kind: a.kind,
      at: a.at,
      source: a.source,
      description: `${EVIDENCE_LABEL[a.kind]} tercatat`,
    }));

  if (!changed && newEvents.length === 0) return service;

  const events = [...service.events, ...newEvents].sort((a, b) =>
    a.at.localeCompare(b.at),
  );
  const complete = required.every(
    (k) => evidence.find((e) => e.kind === k)?.state === "present",
  );

  return {
    ...service,
    evidence,
    events,
    status: complete ? "SELESAI" : service.status,
    endTime:
      complete && !service.endTime
        ? (evidence.find((e) => e.kind === "claim")?.at ?? service.startTime)
        : service.endTime,
  };
}

export type StartServiceInput = {
  patientId: string;
  providerId: string;
  templateId: string;
  servicePoint: string;
};

type AppContextValue = {
  hydrated: boolean;
  state: Persisted;
  src: DataSource;
  user: User;
  role: Role;
  unread: number;
  setRole: (role: Role) => void;
  startService: (input: StartServiceInput) => string;
  addEvidence: (serviceId: string, kind: EvidenceKind) => void;
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

let cacheState: Persisted = initialState;
let cacheLoaded = false;
const listeners = new Set<() => void>();

function loadCache(): Persisted {
  if (!cacheLoaded && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        cacheState = { ...initialState, ...(JSON.parse(raw) as Partial<Persisted>) };
      }
    } catch {
      // storage tidak tersedia — pakai state awal
    }
    cacheLoaded = true;
  }
  return cacheState;
}

function getServerSnapshot(): Persisted {
  return initialState;
}

function subscribeCache(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function commitCache(next: Persisted) {
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
    (updater: (prev: Persisted) => Persisted) => {
      commitCache(updater(loadCache()));
    },
    [],
  );

  const src = React.useMemo<DataSource>(() => {
    const base = [
      ...seedSource.services,
      ...state.createdServices,
    ].map((s) => applyAdds(s, state.evidenceAdds));

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

  const pushAudit = (
    list: AuditEntry[],
    entry: Omit<AuditEntry, "id" | "at" | "user">,
    userName: string,
  ): AuditEntry[] => [
    { id: uid("AUD"), at: nowStamp(), user: userName, ...entry },
    ...list,
  ];

  const startService = React.useCallback(
    (input: StartServiceInput): string => {
      const seq = state.nextSeq;
      const key = String(seq).padStart(2, "0");
      const id = `SVC-085${key}-01`;
      const start = clockHM();
      const template = getTemplate(input.templateId);

      const evidence = template.required.map((kind) =>
        kind === "arrival"
          ? {
              kind,
              state: "present" as const,
              at: start,
              citation: `E-${key}-01`,
              source: "Operator" as const,
            }
          : {
              kind,
              state: "missing" as const,
              citation: `E-${key}-${String(
                EVIDENCE_ORDER.indexOf(kind) + 1,
              ).padStart(2, "0")}`,
              note: "Belum tercatat",
            },
      );

      const service: Service = {
        id,
        patientId: input.patientId,
        providerId: input.providerId,
        facilityId: template.id === "TPL-LAB" ? "FAC-02" : "FAC-01",
        templateId: input.templateId,
        servicePoint: input.servicePoint,
        date: APP_TODAY,
        startTime: start,
        status: "AKTIF",
        evidence,
        events: [
          {
            id: `EV-${id}-START`,
            serviceId: id,
            kind: "start",
            at: start,
            source: "Operator",
            description: "Pelayanan dimulai",
          },
          {
            id: `EV-${id}-ARRIVAL`,
            serviceId: id,
            kind: "arrival",
            at: start,
            source: "Operator",
            description: "Kedatangan pasien tercatat",
          },
        ],
      };

      setState((prev) => ({
        ...prev,
        nextSeq: prev.nextSeq + 1,
        createdServices: [...prev.createdServices, service],
        audit: pushAudit(
          prev.audit,
          {
            action: "SERVICE_STARTED",
            entity: "Service",
            entityId: id,
            description: `Pelayanan ${template.name.toLowerCase()} dimulai untuk ${input.patientId}.`,
          },
          user.name,
        ),
      }));

      return id;
    },
    [setState, state.nextSeq, user.name],
  );

  const addEvidence = React.useCallback(
    (serviceId: string, kind: EvidenceKind) => {
      const at = clockHM();
      const source: EvidenceSource =
        kind === "billing" || kind === "claim" ? "Sistem" : "Provider";

      setState((prev) => {
        const service = [
          ...seedSource.services,
          ...prev.createdServices,
        ].find((s) => s.id === serviceId);
        if (!service) return prev;

        const required = getTemplate(service.templateId).required;
        const willBeComplete = required.every((k) => {
          if (k !== kind) {
            return service.evidence.find((e) => e.kind === k)?.state === "present";
          }
          return true;
        });

        let audit = pushAudit(
          prev.audit,
          {
            action: "EVIDENCE_ADDED",
            entity: "Evidence",
            entityId: `${serviceId}#${kind}`,
            description: `${EVIDENCE_LABEL[kind]} tercatat untuk ${serviceId}.`,
          },
          user.name,
        );

        if (willBeComplete && service.status === "AKTIF") {
          audit = pushAudit(
            audit,
            {
              action: "SERVICE_COMPLETED",
              entity: "Passport",
              entityId: serviceId,
              description: `Seluruh evidence ${serviceId} lengkap — Service Passport COMPLETE.`,
            },
            user.name,
          );
        }

        return {
          ...prev,
          evidenceAdds: [
            ...prev.evidenceAdds,
            { serviceId, kind, at, source },
          ],
          audit,
        };
      });
    },
    [setState, user.name],
  );

  const submitReview = React.useCallback(
    (claimId: string, action: ReviewActionKind, note: string) => {
      const statusMap: Record<ReviewActionKind, ClaimStatus> = {
        NEED_CLARIFICATION: "NEEDS CLARIFICATION",
        MARK_SUPPORTED: "SUPPORTED",
        RETURN_FOR_REVIEW: "NEEDS REVIEW",
      };

      setState((prev) => {
        const review: ReviewAction = {
          id: uid("RA"),
          claimId,
          action,
          note,
          by: user.name,
          at: nowStamp(),
        };
        const audit = pushAudit(
          prev.audit,
          {
            action: "REVIEW_ACTION",
            entity: "Review",
            entityId: claimId,
            description: `Aksi tinjauan: ${REVIEW_LABEL[action]} untuk ${claimId}.`,
          },
          user.name,
        );
        const notification: Notification = {
          id: uid("NTF"),
          title: `${claimId} — ${REVIEW_LABEL[action]}`,
          body: note.slice(0, 120),
          at: nowStamp(),
          read: false,
        };

        return {
          ...prev,
          statusOverrides: {
            ...prev.statusOverrides,
            [claimId]: statusMap[action],
          },
          reviews: [review, ...prev.reviews],
          audit,
          notifications: [notification, ...prev.notifications],
        };
      });
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
    setState(() => initialState);
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
