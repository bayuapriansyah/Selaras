"use client";

import * as React from "react";
import QRCode from "qrcode";
import { BadgeCheck, QrCode, ScanLine, X } from "lucide-react";
import type { CaptureChannel, Role } from "@/data/app/types";
import {
  QR_REASON_MESSAGE,
  QR_TTL_MINUTES,
  verifyQrToken,
  type QrVerifyReason,
} from "@/lib/app/qr";
import { ROLE_LABEL } from "@/lib/app/actions";
import { can } from "@/lib/app/permissions";
import { Button } from "@/components/ui/button";

type ScanResult = { rawValue?: string };

type BarcodeDetectorCtor = new (opts: { formats: string[] }) => {
  detect(source: HTMLVideoElement): Promise<ScanResult[]>;
};

function getDetector(): BarcodeDetectorCtor | null {
  const w = window as unknown as {
    BarcodeDetector?: BarcodeDetectorCtor;
  };
  return w.BarcodeDetector ?? null;
}

type Props = {
  token: string | null;
  serviceId: string;
  channel: CaptureChannel | null;
  role: Role;
  onVerified: (channel: CaptureChannel) => void;
  onRejected?: (reason: QrVerifyReason) => void;
};

export function QrPanel({
  token,
  serviceId,
  channel,
  role,
  onVerified,
  onRejected,
}: Props) {
  const [qrSrc, setQrSrc] = React.useState<string | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [scanNote, setScanNote] = React.useState<string | null>(null);
  const [manual, setManual] = React.useState("");
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const canScan =
    can(role, "captureOperational") || can(role, "captureClinical");
  const scanTitle = canScan
    ? undefined
    : `${ROLE_LABEL[role] ?? role} tidak berwenang membuka sesi — serahkan ke Operator/Provider.`;

  React.useEffect(() => {
    let alive = true;
    if (!token) return;
    QRCode.toDataURL(token, {
      margin: 1,
      width: 220,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (alive) setQrSrc(url);
      })
      .catch(() => {
        if (alive) setQrSrc(null);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  const stopScan = React.useCallback(() => {
    setScanning(false);
    setScanNote(null);
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  React.useEffect(() => stopScan, [stopScan]);

  React.useEffect(() => {
    if (scanning && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [scanning]);

  const handleToken = React.useCallback(
    async (raw: string, via: CaptureChannel) => {
      const res = await verifyQrToken(raw, { serviceId, role });
      stopScan();
      if (res.ok) {
        setScanNote(null);
        onVerified(via);
      } else {
        setScanNote(QR_REASON_MESSAGE[res.reason]);
        onRejected?.(res.reason);
      }
    },
    [onRejected, onVerified, role, serviceId, stopScan],
  );

  async function startScan() {
    setScanNote(null);
    if (!canScan || !token) return;

    const Detector = getDetector();
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setScanNote("Pemindai kamera tidak tersedia di perangkat ini — gunakan DEMO SCAN.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);

      const detector = new Detector({ formats: ["qr_code"] });
      timerRef.current = window.setInterval(async () => {
        const target = videoRef.current;
        if (!target) return;
        try {
          const found = await detector.detect(target);
            const raw = found[0]?.rawValue;
            if (raw) void handleToken(raw, "QR");
        } catch {
          // frame belum siap — lanjut
        }
      }, 400);
    } catch {
      setScanNote("Akses kamera ditolak — gunakan DEMO SCAN.");
      stopScan();
    }
  }

  const verified = channel !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-2">
          {qrSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- QR dihasilkan client-side sebagai data URL
            <img
              src={qrSrc}
              alt={`QR sesi ${serviceId}`}
              width={148}
              height={148}
              className="size-[148px] rounded-lg"
            />
          ) : (
            <div className="size-[148px] animate-pulse rounded-lg bg-slate-100" />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Token point-of-care
            </p>
            <p className="mt-0.5 font-mono text-[11px] break-all tracking-wider text-slate-500">
              {token ?? "Menyiapkan token…"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Terikat: {ROLE_LABEL[role] ?? role} · berlaku {QR_TTL_MINUTES}{" "}
              menit · tanpa data pasien di QR.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-full"
              disabled={!canScan || token === null}
              title={scanTitle}
              onClick={scanning ? stopScan : startScan}
            >
              {scanning ? (
                <>
                  <X aria-hidden="true" className="size-3.5" />
                  Tutup Pemindai
                </>
              ) : (
                <>
                  <ScanLine aria-hidden="true" className="size-3.5" />
                  SCAN QR
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-full"
              disabled={!canScan || token === null}
              title={scanTitle}
              onClick={() => {
                if (token) void handleToken(token, "QR");
              }}
            >
              <QrCode aria-hidden="true" className="size-3.5" />
              DEMO SCAN
            </Button>
            <span
              title="Integrasi NFC menyusul"
              className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500"
            >
              NFC · siap integrasi
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              disabled={!canScan}
              aria-label="Token manual"
              placeholder="Tempel token manual…"
              className="h-8 min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-3 font-mono text-[11px] text-slate-600 focus-visible:outline-2 focus-visible:outline-sky-400 disabled:bg-slate-50 disabled:text-slate-400"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-full"
              disabled={!canScan || manual.trim().length === 0}
              title={scanTitle}
              onClick={() => {
                void handleToken(manual, "QR");
              }}
            >
              Verifikasi
            </Button>
          </div>

          {scanNote ? (
            <p className="text-xs text-amber-700" role="alert">
              {scanNote}
            </p>
          ) : null}

          {verified ? (
            <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <BadgeCheck aria-hidden="true" className="size-3.5" />
              Sesi terverifikasi · channel {channel}
            </p>
          ) : null}
        </div>
      </div>

      {scanning ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
          <video
            ref={videoRef}
            className="h-44 w-full object-cover"
            muted
            playsInline
          />
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[10px] tracking-wider text-white">
            Arahkan kamera ke QR layanan
          </span>
        </div>
      ) : null}
    </div>
  );
}
