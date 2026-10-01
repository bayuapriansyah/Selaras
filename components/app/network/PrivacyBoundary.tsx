import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

export function PrivacyBoundary() {
  return (
    <section
      aria-label="Privacy boundary"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
        Privacy Boundary
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Network layer hanya berbagi METADATA POLA antar faskes — bukan data
        pasien. Matching dilakukan lokal di tiap faskes.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-emerald-800 uppercase">
            <Eye aria-hidden="true" className="size-3.5" />
            Data shared
          </p>
          <ul className="flex flex-col gap-1.5 text-xs text-emerald-900">
            <li>· ID Risk Signature + versi pola</li>
            <li>· Kondisi deteksi (jenis template, jendela waktu)</li>
            <li>· Jumlah match &amp; kode faskes (A–D)</li>
            <li>· Rekomendasi kontrol &amp; severity</li>
            <li>· Outcome agregat verifikasi (PASS / klarifikasi / human)</li>
          </ul>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-red-800 uppercase">
            <EyeOff aria-hidden="true" className="size-3.5" />
            Data NOT shared
          </p>
          <ul className="flex flex-col gap-1.5 text-xs text-red-900">
            <li>· Identitas pasien &amp; nomor kartu</li>
            <li>· Detail klinis / diagnosis</li>
            <li>· Isi dokumen &amp; lampiran bukti</li>
            <li>· Nama lengkap provider &amp; catatan medis</li>
            <li>· Rincian tagihan per klaim</li>
          </ul>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        Prinsip: sinyal berpindah, data tidak. Faskes menerima “vaksin pola”
        (signature), bukan rekam medis tetangganya.
      </p>
    </section>
  );
}
