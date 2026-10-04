import * as React from "react";

/**
 * Catatan privasi standar halaman jaringan — batas berbagi kecerdasan
 * (bukan identitas) + keterangan jujur bahwa jaringan masih simulasi prototipe.
 */
export function NetworkPrivacyNote({ extra }: { extra?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-800">
      <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-sky-900 uppercase">
        Shared Intelligence — Not Shared Identity
      </p>
      <p className="mt-2">
        Network menggunakan data sintetis untuk demonstrasi. Integrasi lintas
        fasilitas dan data produksi memerlukan governance, authorization, dan
        privacy-preserving infrastructure.
      </p>
      {extra ? <p className="mt-2">{extra}</p> : null}
    </div>
  );
}
