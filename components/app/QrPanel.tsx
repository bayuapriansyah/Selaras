"use client";

import * as React from "react";
import QRCode from "qrcode";
import { BadgeCheck, QrCode, ScanLine, X } from "lucide-react";
import type { CaptureChannel } from "@/data/app/types";
import { parseQrToken } from "@/lib/app/qr";
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
  token: string;
  serviceId: string;
  channel: CaptureChannel | null;
  onVerified: (channel: CaptureChannel) => void;
};

export function QrPanel({ token, serviceId, channel, onVerified }: Props) {
  const [qrSrc, setQrSrc] = React.useState<string | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [scanNote, setScanNote] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    let alive = true;
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
    (raw: string, via: CaptureChannel) => {
      const parsed = parseQrToken(raw);
      if (parsed === serviceId) {
        stopScan();
        onVerified(via);
      } else {
        setScanNote("Token tidak cocok dengan sesi layanan ini.");
      }
    },
    [onVerified, serviceId, stopScan],
  );

  async function startScan() {
    setScanNote(null);

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
          if (raw) handleToken(raw, "QR");
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
            <p className="mt-0.5 font-mono text-[11px] tracking-wider text-slate-500">
              {token}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Scan untuk membuka capture evidence — tanpa data pasien di QR.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-full"
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
              onClick={() => handleToken(token, "QR")}
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
