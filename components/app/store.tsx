"use client";

import * as React from "react";
import { currentUser as seedUser, users } from "@/data/app/seed";
import type {
  AuditEntry,
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
  mergePersistedState,
  nowStamp,
  pushAudit,
  uid,
  type PersistedState,
  type StartServiceInput,
} from "@/lib/app/appState";
import { ROLE_LABEL } from "@/lib/app/actions";
import {
  signatureSeeds,
  VERIFICATION_RESULT_OUTCOME,
  type NetworkProposal,
  type SignatureFeedback,
  type SignatureSeverity,
  type SignatureStatus,
  type VerificationResult,
} from "@/data/app/network";
import type { NetworkCondition } from "@/data/app/network";
import type {
  Attestation,
  EvidenceEvent,
  ProofAssessment,
  ProofState,
  ServiceAnchorEvent,
} from "@/data/app/proof";
import { PROOF_MODEL_VERSION } from "@/data/app/proof";
import {
  allMatches,
  facilityNodeLabel,
  signatureBundle,
} from "@/lib/app/network";
import {
  captureEvidence,
  startService as startServiceReducer,
} from "@/lib/app/services/serviceService";
import { submitReview as submitReviewReducer } from "@/lib/app/services/reviewService";
import {
  appendAnchorEvent,
  assessProofAction,
  attestServiceStart as attestServiceStartReducer,
  confirmServiceAnchor,
  sealProofAction,
  type AnchorConfirmInput,
  type AnchorConfirmResult,
} from "@/lib/app/services/proofService";
import {
  appendProvenance,
  type ProvenanceAppendInput,
} from "@/lib/app/services/provenanceService";

export type { EvidenceAdd, StartServiceInput } from "@/lib/app/appState";

const STORAGE_KEY = "selaras-app-v1";

export type ProposeSignatureInput = {
  name: string;
  pattern: string;
  signalNotes: string[];
  detectionConditions: NetworkCondition[];
  requiredEvidence: string[];
  recommendedControl: string;
  severity: SignatureSeverity;
  serviceScope: string;
  originClaimId?: string;
  originFacilityId?: string;
};

export type NetworkRuntime = {
  statusOverrides: Record<string, SignatureStatus>;
  proposals: NetworkProposal[];
  feedbacks: SignatureFeedback[];
};

export type ProofEventInput = Omit<EvidenceEvent, "id" | "recordedAt">;

export type AttestationInput = Omit<Attestation, "id" | "at">;

export type AnchorEventInput = Omit<ServiceAnchorEvent, "id" | "anchoredAt">;

export type ProvenanceInput = ProvenanceAppendInput;

export type ProofAssessmentInput = Omit<
  ProofAssessment,
  "assessedAt" | "modelVersion"
>;

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
  logAudit: (
    entry: Omit<AuditEntry, "id" | "at" | "user" | "role">,
  ) => void;
  statusOf: (claimId: string, base: ClaimStatus) => ClaimStatus;
  networkRuntime: NetworkRuntime;
  proposeSignature: (input: ProposeSignatureInput) => string;
  decideProposal: (
    proposalId: string,
    decision: "APPROVED" | "REJECTED" | "REVISION_REQUESTED",
    note?: string,
  ) => void;
  publishSignature: (signatureId: string) => void;
  startVerification: (matchKey: string, claimId: string, signatureId: string) => void;
  completeVerification: (
    matchKey: string,
    claimId: string,
    signatureId: string,
    result: VerificationResult,
    note?: string,
  ) => void;
  addProofEvent: (input: ProofEventInput) => string;
  addAttestation: (input: AttestationInput) => string;
  addAnchorEvent: (input: AnchorEventInput) => string;
  attestServiceStart: (serviceId: string) => void;
  confirmAnchor: (input: AnchorConfirmInput) => AnchorConfirmResult;
  addProvenanceRecord: (input: ProvenanceInput) => string;
  setProofState: (subjectId: string, state: ProofState) => void;
  setProofAssessment: (claimId: string, input: ProofAssessmentInput) => void;
  assessProof: (claimId: string) => void;
  sealProof: (claimId: string) => boolean;
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
        cacheState = mergePersistedState(JSON.parse(raw));
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
        const result = startServiceReducer(
          prev,
          input,
          user.name,
          user.role,
          user.id,
        );
        id = result.serviceId;
        return result.state;
      });
      return id;
    },
    [setState, user],
  );

  const addEvidence = React.useCallback(
    (serviceId: string, kind: EvidenceKind, channel?: CaptureChannel) => {
      setState(
        (prev) =>
          captureEvidence(
            prev,
            serviceId,
            kind,
            user.name,
            user.role,
            channel,
            user.id,
          ) ?? prev,
      );
    },
    [setState, user],
  );

  const submitReview = React.useCallback(
    (claimId: string, action: ReviewActionKind, note: string) => {
      setState((prev) =>
        submitReviewReducer(prev, claimId, action, note, user.name, user.role),
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
    setState((prev) => {
      if (prev.role === role) return prev;
      const nextUser = users.find((u) => u.role === role);
      return {
        ...prev,
        role,
        audit: pushAudit(
          prev.audit,
          {
            action: "ROLE_CHANGED",
            entity: "User",
            entityId: nextUser?.id ?? role,
            description: `Role diubah menjadi ${ROLE_LABEL[role] ?? role}.`,
          },
          nextUser?.name ?? "Pengguna Demo",
          role,
        ),
      };
    });
  }, [setState]);

  const statusOf = React.useCallback(
    (claimId: string, base: ClaimStatus): ClaimStatus =>
      state.statusOverrides[claimId] ?? base,
    [state.statusOverrides],
  );

  const logAudit = React.useCallback(
    (entry: Omit<AuditEntry, "id" | "at" | "user" | "role">) => {
      setState((prev) => {
        const u = users.find((x) => x.role === prev.role);
        return {
          ...prev,
          audit: pushAudit(
            prev.audit,
            entry,
            u?.name ?? "Pengguna Demo",
            prev.role,
          ),
        };
      });
    },
    [setState],
  );

  const networkRuntime = React.useMemo<NetworkRuntime>(
    () => ({
      statusOverrides: state.signatureStatus,
      proposals: state.proposals,
      feedbacks: state.feedbacks,
    }),
    [state.signatureStatus, state.proposals, state.feedbacks],
  );

  const proposeSignature = React.useCallback(
    (input: ProposeSignatureInput): string => {
      let newSignatureId = "";
      setState((prev) => {
        const u = users.find((x) => x.role === prev.role);
        const name = u?.name ?? "Pengguna Demo";
        const id = uid("PROP");
        newSignatureId = `RS-${String(20 + prev.proposals.length).padStart(3, "0")}`;
        const now = nowStamp();
        const proposal: NetworkProposal = {
          ...input,
          id,
          proposedSignatureId: newSignatureId,
          status: "DRAFT",
          createdBy: name,
          createdAt: now,
          updatedAt: now,
        };
        return {
          ...prev,
          proposals: [proposal, ...prev.proposals],
          audit: pushAudit(
            prev.audit,
            {
              action: "SIG_PROPOSED",
              entity: "Network",
              entityId: newSignatureId,
              description: `Proposal ${newSignatureId} — ${input.name} diajukan${
                input.originClaimId ? ` dari ${input.originClaimId}` : ""
              } (status DRAF).`,
            },
            name,
            prev.role,
          ),
        };
      });
      return newSignatureId;
    },
    [setState],
  );

  const decideProposal = React.useCallback(
    (
      proposalId: string,
      decision: "APPROVED" | "REJECTED" | "REVISION_REQUESTED",
      note?: string,
    ) => {
      setState((prev) => {
        const u = users.find((x) => x.role === prev.role);
        const name = u?.name ?? "Pengguna Demo";
        const proposal = prev.proposals.find((p) => p.id === proposalId);
        if (!proposal) return prev;
        const action =
          decision === "APPROVED"
            ? "SIG_APPROVED"
            : decision === "REJECTED"
              ? "SIG_REJECTED"
              : "SIG_REVISION";
        const desc =
          decision === "APPROVED"
            ? `Proposal ${proposal.proposedSignatureId} disetujui — menjadi Risk Signature VALIDATED.`
            : decision === "REJECTED"
              ? `Proposal ${proposal.proposedSignatureId} ditolak dan tidak diterbitkan.`
              : `Revisi diminta untuk proposal ${proposal.proposedSignatureId}.`;
        return {
          ...prev,
          proposals: prev.proposals.map((p) =>
            p.id === proposalId
              ? {
                  ...p,
                  status: decision,
                  updatedAt: nowStamp(),
                  decidedBy: name,
                  decidedAt: nowStamp(),
                  revisionNote: note ?? p.revisionNote,
                }
              : p,
          ),
          audit: pushAudit(
            prev.audit,
            {
              action,
              entity: "Network",
              entityId: proposal.proposedSignatureId,
              description: note ? `${desc} Catatan: ${note}` : desc,
            },
            name,
            prev.role,
          ),
        };
      });
    },
    [setState],
  );

  const publishSignature = React.useCallback(
    (signatureId: string) => {
      setState((prev) => {
        const u = users.find((x) => x.role === prev.role);
        const name = u?.name ?? "Pengguna Demo";
        const bundle = signatureBundle(
          signatureSeeds,
          prev.proposals,
          prev.signatureStatus,
        );
        const sig = bundle.all.find((s) => s.id === signatureId);
        if (!sig || sig.status === "ACTIVE" || sig.status === "RETIRED") {
          return prev;
        }
        const before = allMatches(bundle.active, src);
        const after = allMatches(
          [...bundle.active, { ...sig, status: "ACTIVE" as const }],
          src,
        );
        const newMatches = after.filter(
          (m) => !before.some((b) => b.key === m.key),
        );
        let audit = pushAudit(
          prev.audit,
          {
            action: "SIG_PUBLISHED",
            entity: "Network",
            entityId: sig.id,
            description: `Risk Signature ${sig.id} — ${sig.name} dipublikasikan ke jaringan simulasi (status AKTIF).`,
          },
          name,
          prev.role,
        );
        for (const m of newMatches) {
          audit = pushAudit(
            audit,
            {
              action: "NET_MATCH",
              entity: "Network",
              entityId: m.claimId,
              description: `Match jaringan ${sig.id} aktif untuk ${m.claimId} · ${facilityNodeLabel(m.facilityId)}.`,
            },
            name,
            prev.role,
          );
        }
        return {
          ...prev,
          signatureStatus: {
            ...prev.signatureStatus,
            [signatureId]: "ACTIVE",
          },
          audit,
        };
      });
    },
    [setState, src],
  );

  const startVerification = React.useCallback(
    (matchKey: string, claimId: string, signatureId: string) => {
      setState((prev) => {
        const u = users.find((x) => x.role === prev.role);
        return {
          ...prev,
          audit: pushAudit(
            prev.audit,
            {
              action: "NET_VERIFICATION_STARTED",
              entity: "Network",
              entityId: claimId,
              description: `Verifikasi step-up dimulai untuk ${claimId} (match ${signatureId}).`,
            },
            u?.name ?? "Pengguna Demo",
            prev.role,
          ),
        };
      });
      void matchKey;
    },
    [setState],
  );

  const completeVerification = React.useCallback(
    (
      matchKey: string,
      claimId: string,
      signatureId: string,
      result: VerificationResult,
      note?: string,
    ) => {
      setState((prev) => {
        const u = users.find((x) => x.role === prev.role);
        const name = u?.name ?? "Pengguna Demo";
        const feedback: SignatureFeedback = {
          id: uid("FB"),
          matchKey,
          signatureId,
          claimId,
          result,
          outcome: VERIFICATION_RESULT_OUTCOME[result],
          note,
          by: name,
          at: nowStamp(),
        };
        return {
          ...prev,
          feedbacks: [feedback, ...prev.feedbacks],
          audit: pushAudit(
            prev.audit,
            {
              action: "NET_VERIFICATION_RESULT",
              entity: "Network",
              entityId: claimId,
              description: `Hasil verifikasi ${claimId} (${signatureId}): ${result} — hasil ${feedback.outcome}.`,
            },
            name,
            prev.role,
          ),
        };
      });
    },
    [setState],
  );

  const addProofEvent = React.useCallback(
    (input: ProofEventInput): string => {
      const id = uid("PEV");
      setState((prev) => ({
        ...prev,
        proofEvents: [{ ...input, id, recordedAt: nowStamp() }, ...prev.proofEvents],
      }));
      return id;
    },
    [setState],
  );

  const addAttestation = React.useCallback(
    (input: AttestationInput): string => {
      const id = uid("ATT");
      setState((prev) => ({
        ...prev,
        attestations: [{ ...input, id, at: nowStamp() }, ...prev.attestations],
      }));
      return id;
    },
    [setState],
  );

  const addAnchorEvent = React.useCallback(
    (input: AnchorEventInput): string => {
      let id = "";
      setState((prev) => {
        const u = users.find((x) => x.role === prev.role);
        const result = appendAnchorEvent(prev, input, {
          id: u?.id,
          name: u?.name ?? "Pengguna Demo",
          role: prev.role,
        });
        id = result.id;
        return result.state;
      });
      return id;
    },
    [setState],
  );

  const attestServiceStart = React.useCallback(
    (serviceId: string): void => {
      setState((prev) => {
        const u = users.find((x) => x.role === prev.role);
        return attestServiceStartReducer(prev, serviceId, {
          id: u?.id,
          name: u?.name ?? "Pengguna Demo",
          role: prev.role,
        }).state;
      });
    },
    [setState],
  );

  const confirmAnchor = React.useCallback(
    (input: AnchorConfirmInput): AnchorConfirmResult => {
      let out!: AnchorConfirmResult;
      setState((prev) => {
        const u = users.find((x) => x.role === prev.role);
        const result = confirmServiceAnchor(prev, input, {
          id: u?.id,
          name: u?.name ?? "Pengguna Demo",
          role: prev.role,
        });
        out = result;
        return result.state;
      });
      return out;
    },
    [setState],
  );

  const addProvenanceRecord = React.useCallback(
    (input: ProvenanceInput): string => {
      let id = "";
      setState((prev) => {
        const u = users.find((x) => x.role === prev.role);
        const result = appendProvenance(
          prev,
          input,
          { name: u?.name ?? "Pengguna Demo", role: prev.role },
        );
        id = result.record.id;
        return result.state;
      });
      return id;
    },
    [setState],
  );

  const setProofState = React.useCallback(
    (subjectId: string, state: ProofState) => {
      setState((prev) => {
        if (prev.proofStates[subjectId] === state) return prev;
        return {
          ...prev,
          proofStates: { ...prev.proofStates, [subjectId]: state },
        };
      });
    },
    [setState],
  );

  const setProofAssessment = React.useCallback(
    (claimId: string, input: ProofAssessmentInput) => {
      setState((prev) => ({
        ...prev,
        proofAssessments: {
          ...prev.proofAssessments,
          [claimId]: {
            ...input,
            claimId,
            assessedAt: nowStamp(),
            modelVersion: PROOF_MODEL_VERSION,
          },
        },
      }));
    },
    [setState],
  );

  const assessProof = React.useCallback(
    (claimId: string) => {
      setState((prev) => {
        const u = users.find((x) => x.role === prev.role);
        return assessProofAction(prev, claimId, {
          id: u?.id,
          name: u?.name ?? "Pengguna Demo",
          role: prev.role,
        });
      });
    },
    [setState],
  );

  const sealProof = React.useCallback(
    (claimId: string): boolean => {
      let sealed = false;
      setState((prev) => {
        const u = users.find((x) => x.role === prev.role);
        const next = sealProofAction(prev, claimId, {
          id: u?.id,
          name: u?.name ?? "Pengguna Demo",
          role: prev.role,
        });
        sealed = next.proofStates[claimId] === "SEALED";
        return next;
      });
      return sealed;
    },
    [setState],
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
      logAudit,
      statusOf,
      networkRuntime,
      proposeSignature,
      decideProposal,
      publishSignature,
      startVerification,
      completeVerification,
      addProofEvent,
      addAttestation,
      addAnchorEvent,
      attestServiceStart,
      confirmAnchor,
      addProvenanceRecord,
      setProofState,
      setProofAssessment,
      assessProof,
      sealProof,
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
      logAudit,
      statusOf,
      networkRuntime,
      proposeSignature,
      decideProposal,
      publishSignature,
      startVerification,
      completeVerification,
      addProofEvent,
      addAttestation,
      addAnchorEvent,
      attestServiceStart,
      confirmAnchor,
      addProvenanceRecord,
      setProofState,
      setProofAssessment,
      assessProof,
      sealProof,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp harus dipakai di dalam AppStoreProvider");
  return ctx;
}
