# SELARAS

**Sistem Evaluasi Layanan & Rekam Administrasi untuk Risiko Klaim** — lapisan integritas *evidence-first* untuk klaim fasilitas kesehatan dalam ekosistem JKN.

> *Detect Smarter, Protect JKN* · Prototipe untuk **Healthkathon 2026** · Kategori **Fasilitas Kesehatan → Phantom & Repeat Billing** · Tingkat kematangan: **Prototype** · Data **100% sintetis**

---

## Masalah

Di skala **284.514.113 peserta JKN** dan **23.812 FKTP** (BPJS Kesehatan, s.d. 31 Agustus 2026), setiap klaim berdiri di atas bukti pelayanan yang harusnya sudah terbentuk di titik layanan — tetapi bukti itu justru dicari **setelah** klaim masuk.

- Fraud faskes tercatat **Rp 6,8 triliun** (Jan–Okt 2025) — dua modus teratas: *phantom billing* & *manipulation diagnosis*, termasuk *repeat billing* (Kompas.id, 10 Des 2025).
- Temuan audit tim gabungan KPK–Kemenkes–BPJS–BPKP (Juli 2024): dari **4.341 kasus** klaim fisioterapi di 3 RS, hanya **1.072 (24,7%)** punya catatan rekam medis — **3.269 (75,3%) diduga fiktif, Rp 501,27 juta** (Kemenkes/KPK, 2024).
- Verifikasi yang ada (verifikasi awal, VPK, AAK) semuanya bekerja **reaktif — setelah bayar**.

**Akar masalahnya bukan niat, tapi arsitektur bukti:** informasi pelayanan tersebar di appointment, encounter, provider, treatment, catatan klinis, billing, dan klaim — ketika reviewer harus memverifikasi, cerita sudah tercecer.

Sumber lengkap: `docs/reference/SELARAS-Dokumentasi-Lengkap.pdf` (Bab 3 + Daftar Pustaka 14 sumber).

## Solusi

> **“Anda menjual bukti saat pelayanan terjadi.”** — SELARAS memindahkan pembentukan bukti ke *point of care*, sehingga ketika klaim datang, sistem tinggal **menyusun** buktinya, bukan **mencarinya**.

> **“Satu temuan — semua terlindungi.”** — Integrity Mesh: pola risiko yang tervalidasi di satu faskes melindungi seluruh jaringan, tanpa berbagi data pasien.

**Alur inti (9 langkah):**
`Service → Capture → Service Passport → Evidence Graph → Episode Reconstruction → Reconciliation → Gap/Conflict/Impact → AI Evidence Reasoner → Human Review`

**Prinsip produk:**
- **Evidence First** — bukti dibentuk saat pelayanan, bukan ditambang ulang setelah klaim.
- **Missing ≠ fraud** — bukti hilang = alasan untuk meninjau, bukan vonis kecurangan.
- **Explain Before Escalate** — AI menjelaskan “apa yang diketahui / hilang / didukung”, manusia memutuskan.
- **Human-in-the-Loop** — tanpa keputusan otomatis; semua override tercatat di audit log.

![Dashboard Reviewer](docs/deck/assets/10-dashboard.png)

## Fitur

**Landing page (9 seksi):** Hero · Masalah · Cara Kerja · Service Passport · Golden Case · Penjelasan AI · Skala (Integrity Mesh) · Tata Kelola · CTA — dengan simulasi counterfaktual & graf bukti interaktif.

**Aplikasi (`/app`):**

| Modul | Yang bisa dilakukan |
|---|---|
| **Service Capture & QR point-of-care** | Mulai pelayanan → QR check-in (token HMAC-SHA256, 30 menit, sekali pakai) → catat 6 jenis bukti per sesi |
| **Service Passport** | Ringkasan otomatis satu episode: status kelengkapan bukti per sesi |
| **Reconciliation & Proof Gap Engine** | 6 pemeriksaan klaim ↔ bukti (kuantitas, temporal, identitas, kelengkapan, duplikasi, konflik) + sinyal risiko berpoin |
| **Claim Detail & Review** | Matriks 10 sesi × 6 bukti, dampak rupiah transparan, 4 aksi reviewer + catatan |
| **Replay** | Kronologi 70 langkah, bisa dijeda & diskip |
| **Evidence Graph** | Graf bukti 86 node / 113 rel dengan provenance (sumber, waktu, pencatat) |
| **AI Evidence Reasoner** | Penjelasan 5 blok *evidence-grounded* + Kopilot Klarifikasi (draf surat, reviewer yang finalkan) |
| **Integrity Mesh** | Registry Risk Signature, siklus USULAN→DISETUJUI→DIVALIDASI→AKTIF, match queue, step-up verification |
| **Analitik & Log Audit** | Metrik operasi/investigasi/bukti/AI + jejak permanen aktor-keputusan-waktu |
| **RBAC 4 peran** | `operator` · `provider` · `reviewer` · `admin` — admin sengaja **tidak** punya hak memutuskan klaim |

![Matriks bukti klaim](docs/deck/assets/13-claim-matriks.png)

## Demo cepat

```bash
npm install
npm run dev        # → http://localhost:3000
```

Rute demo:
- `/` — landing page
- `/app` — dashboard reviewer
- `/app/claims/CLM-08421` — **golden case**: 10 sesi diklaim → 8 didukung bukti → 2 ditahan (Rp 2.800.000 lolos, Rp 700.000 antre tinjauan), skor 27 vs ambang gerbang 65
- `/app/claims/CLM-08421/replay` · `/graph` · `/ai` — replay, graf, penjelasan AI
- `/app/network` — Integrity Mesh

Alur demo end-to-end selesai **< 5 menit** (Definition of Done prototipe).

## Tech stack

**Prototipe saat ini (berjalan):**
- [Next.js 16](https://nextjs.org) (App Router) · TypeScript · React 19
- Tailwind CSS 4 · shadcn/ui · Lucide · Recharts · Motion
- Data lokal terstruktur (`data/`, `lib/app/`) — mode seed **sintetis**
- [neo4j-driver](https://neo4j.com/docs/) opsional untuk seed graf: `npm run seed:neo4j`

**Target produksi (arsitektur — PRD §22–23):** FastAPI + PostgreSQL (sumber kebenaran transaksional) + Neo4j (lapisan analitik-relasional) + Redis · integrasi VClaim/SATUSEHAT lewat **adapter** · LLM hanya untuk penjelasan — kalkulasi skor/gap selalu deterministik.

## Struktur repo

```text
app/                  22 halaman App Router + 3 endpoint API
  api/                ai/explain · claims/[id]/impact · graph/[id]
  app/                dashboard, claims, passport, pelayanan, network, audit-log, analytics, ...
components/           sections (landing), app UI, golden case, passport, layout, ui
data/                 seed sintetis: seed.ts (golden case), network.ts, passport.ts, evidence-graph.ts
lib/app/              aturan inti: score.ts (ambang 65), gate.ts, rules.ts, signals.ts,
                      reconciliation, qr.ts (HMAC), permissions.ts, network.ts, explain.ts
hooks/                state aplikasi
docs/
  deck/               proposal 20 slide → SELARAS-Healthkathon-2026.pdf + 21 screenshot
  reference/          dokumentasi lengkap → SELARAS-Dokumentasi-Lengkap.pdf + build.js
SELARAS_PRD_Healthkathon_2026.md   PRD — sumber kebenaran produk (57 bagian, 2.334 baris)
```

## Peran & akses

| Peran | Bisa | Tidak bisa |
|---|---|---|
| `operator` | Mencatat bukti saat pelayanan | Melihat keputusan klaim lintas unit |
| `provider` | Melihat pelayanan faskesnya sendiri | Melihat faskes lain, memutuskan klaim |
| `reviewer` | Memutuskan semua klaim, mengesahkan pola | Mengubah data pelayanan / audit log |
| `admin` | Kelola pengguna, template, konfigurasi | **Memutuskan klaim** (separation of duties) |

9 skenario uji peran otomatis memverifikasi batas di atas.

## Kualitas & pengujian

Pintu mutu yang dijalankan sebelum setiap commit:

```bash
npx tsc --noEmit    # TypeScript — 0 error
npm run lint        # ESLint — 0 error
npm run build       # next build — sukses
```

- **96 skenario uji E2E** (puppeteer-core): alur pelayanan, klaim, replay, graf, AI, mesh, sinyal, peran, responsif, 0 error runtime — tooling di `$TEMP/opencode/shots` (di luar repo)
- Golden case < 5 menit · 0 overflow halaman · landing MD5 baseline dicek

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`SELARAS_PRD_Healthkathon_2026.md`](SELARAS_PRD_Healthkathon_2026.md) | PRD lengkap — masalah, kebutuhan, model data, API, benchmark, roadmap 7 fase |
| [`docs/deck/SELARAS-Healthkathon-2026.pdf`](docs/deck/SELARAS-Healthkathon-2026.pdf) | Proposal resmi 20 slide — memetakan 9 komponen wajib ke 6 dimensi penilaian |
| [`docs/reference/SELARAS-Dokumentasi-Lengkap.pdf`](docs/reference/SELARAS-Dokumentasi-Lengkap.pdf) | **Acuan internal tim** — 14 bab: masalah nyata bersumber, solusi, golden case, arsitektur, keamanan, KPI, daftar pustaka, tabel fakta terverifikasi |

Regenerasi PDF:

```bash
node docs/deck/build-deck.js          # butuh puppeteer-core (NODE_PATH ke instalasi bila perlu)
node docs/reference/build.js          # dokumentasi internal → 27 halaman
```

## Disclaimer

- Seluruh data prototipe **sintetis** — **bukan** data peserta JKN riil, tanpa integrasi langsung ke sistem BPJS Kesehatan.
- SELARAS **bukan** penentu fraud otomatis: AI merekomendasikan, **manusia memutuskan**.
- Angka dampak = **simulasi prototipe / target pilot**, bukan hasil terukur.
- Prototipe, bukan produk produksi; integrasi VClaim/SATUSEHAT masih **dirancang** lewat adapter.

## Roadmap

| Fase | Durasi | Fokus |
|---|---|---|
| 1 | 0–3 bulan | MVP fisioterapi siap integrasi · adapter VClaim/SATUSEHAT (sandbox) · hardening RBAC |
| 2 | 3–9 bulan | Pilot 3–5 faskes · fingerprint rontgen/lab · kalibrasi threshold |
| 3 | 9–18 bulan | Mesh lintas faskes · multi-layanan · evaluasi implementasi luas |

---

**Visi:** *SELARAS menjadi evidence and service integrity layer yang dapat diterapkan lintas jenis layanan kesehatan dalam ekosistem JKN.* — Apa yang dilayani harus selaras dengan apa yang diklaim.
