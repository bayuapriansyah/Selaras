# SELARAS — Product Requirements Document (PRD)

**Produk:** SELARAS  
**Kepanjangan:** Sistem Evaluasi Layanan & Rekam Administrasi untuk Risiko Klaim  
**Tagline:** *Setiap pelayanan meninggalkan bukti sebelum menjadi klaim.*  
**Kategori Healthkathon 2026:** Efisiensi Risiko pada Fasilitas Kesehatan  
**Fokus Risiko:** Phantom & Repeat Billing  
**MVP:** Integritas Pelayanan Fisioterapi  
**Status Dokumen:** Master PRD / Source of Truth Development  
**Versi:** 1.0  
**Tanggal:** 2026-09-29

---

## 0. Konteks dan Acuan

PRD ini disusun untuk pengembangan prototype SELARAS sebagai solusi Healthkathon 2026. Panduan resmi Healthkathon mensyaratkan identitas dan positioning solusi, masalah dan urgensi, solusi dan keunggulan, pendekatan teknis dan data, tingkat kematangan/prototype, rencana dan kelayakan, dampak dan nilai terukur, risiko/privasi/etika, serta profil tim. Panduan juga menetapkan batas maksimum 20 slide untuk proposal, satu kategori dan satu solusi, serta melarang penggunaan data peserta JKN riil tanpa izin resmi.

Panduan resmi menilai enam dimensi: relevansi masalah, kreativitas dan inovasi, kualitas teknologi, efektivitas dan dampak, kesiapan dan skalabilitas, serta keamanan dan tata kelola.

Kategori fasilitas kesehatan mencakup antara lain Phantom & Repeat Billing, Upcoding & Unbundling, Inflated Bills & Cloning, Prolonged Stay & Readmisi, Rujukan & Self-referral, serta Manipulasi Obat & Alkes. SELARAS menjadikan Phantom & Repeat Billing sebagai fokus utama MVP dan memperlakukan pola lain sebagai arah pengembangan.

**Prinsip pengembangan:** produk harus dapat dipahami lintas disiplin, setiap fitur harus terhubung ke masalah, AI harus tepat guna, keputusan material tetap berada pada manusia, dan semua hasil prototype harus dibedakan dari hasil pilot atau implementasi nyata.

---

# 1. Ringkasan Produk

## 1.1 Apa itu SELARAS?

SELARAS adalah lapisan integritas pelayanan yang membentuk bukti sejak titik pelayanan, mengikat bukti dalam **Service Passport**, merekonstruksi episode pelayanan, lalu merekonsiliasi jejak pelayanan dengan billing dan claim.

SELARAS tidak dirancang sebagai:

- mesin yang memberikan vonis fraud secara otomatis;
- pengganti RME/SIMRS;
- sistem klaim baru;
- chatbot kesehatan;
- dashboard anomaly score tanpa bukti pendukung.

SELARAS dirancang sebagai **service-to-claim evidence intelligence layer**.

## 1.2 Pernyataan Nilai

> **Pelayanan terjadi → bukti terbentuk → episode direkonstruksi → klaim dicocokkan → reviewer memperoleh konteks yang dapat ditelusuri.**

## 1.3 Core Shift

### Pendekatan umum

```text
Claim
  ↓
Anomaly / Risk Score
  ↓
Reviewer
```

### Pendekatan SELARAS

```text
Service
  ↓
Evidence Capture
  ↓
Service Passport
  ↓
Episode Reconstruction
  ↓
Service ↔ Claim Reconciliation
  ↓
Evidence / Gap / Contradiction
  ↓
AI Explanation + Review Priority
  ↓
Human Review
```

---

# 2. Problem Statement

## 2.1 Masalah Inti

Dalam sebuah episode pelayanan kesehatan, informasi terbentuk secara bertahap dan dapat tersebar pada appointment, encounter, provider, treatment/procedure, clinical note, operational event, billing, dan claim.

Ketika sebuah claim perlu diverifikasi, reviewer harus mengetahui:

1. apa yang sebenarnya diklaim;
2. evidence apa yang seharusnya ada;
3. evidence apa yang benar-benar ditemukan;
4. bagian mana yang hilang atau tidak konsisten;
5. kapan perbedaan terjadi;
6. bagaimana perbedaan tersebut berdampak pada claim;
7. apakah kasus perlu diperiksa lebih lanjut.

Masalahnya bukan hanya mendeteksi anomali. Masalah utamanya adalah **rekonstruksi dan pembuktian konteks pelayanan**.

## 2.2 Hero Problem

> **Phantom / Unsubstantiated Service:** claim atas pelayanan yang tidak memiliki rangkaian bukti pelayanan yang cukup, konsisten, atau dapat direkonstruksi dari data yang tersedia.

## 2.3 MVP Example: Fisioterapi

Expected service footprint:

```text
Appointment
   ↓
Patient Arrival
   ↓
Provider Assignment
   ↓
Treatment
   ↓
Clinical Note
   ↓
Completion
   ↓
Billing
   ↓
Claim
```

Jika claim menyatakan 10 sesi, sedangkan hanya 8 sesi mempunyai evidence chain yang memadai, SELARAS menghasilkan **Evidence Gap / Claim-Service Divergence**, bukan vonis fraud.

## 2.4 Mengapa Point-of-Care?

Jika evidence baru dicari setelah claim bermasalah, bukti dapat tersebar, terlambat, atau sulit direkonstruksi. SELARAS memindahkan pembentukan evidence ke titik pelayanan agar setiap episode memiliki konteks sejak awal.

---

# 3. Goals & Objectives

## 3.1 Product Goals

1. Membuat pelayanan dapat direpresentasikan sebagai episode yang memiliki evidence trail.
2. Membentuk **Service Passport** sebagai ringkasan satu episode pelayanan.
3. Menghubungkan service evidence dengan billing dan claim.
4. Mempercepat pemahaman reviewer terhadap kasus yang memerlukan pemeriksaan.
5. Menjelaskan alasan review melalui evidence-grounded explanation.
6. Menyediakan jalur pengembangan dari satu service fingerprint ke banyak jenis layanan.

## 3.2 Hackathon Goals

Prototype harus dapat menunjukkan end-to-end flow:

```text
Start Service
  → Evidence Capture
  → Service Passport
  → Claim Ingestion
  → Reconciliation
  → Evidence Gap
  → Replay
  → AI Explanation
  → Human Review
```

## 3.3 Non-Goals

Untuk MVP, SELARAS tidak bertujuan:

- menetapkan fraud secara otomatis;
- menggantikan proses resmi verifikasi BPJS;
- menggantikan RME/SIMRS;
- mengintegrasikan data JKN riil tanpa otorisasi;
- menyelesaikan seluruh modus risiko fasilitas kesehatan sekaligus;
- memberikan diagnosis atau keputusan klinis kepada pasien;
- mengklaim outcome klinis tanpa validasi.

---

# 4. Target Users & Personas

## 4.1 Facility Staff / Operator

**Tujuan:** membentuk evidence saat pelayanan berlangsung.

Kebutuhan:
- memilih episode;
- memulai/mengakhiri service;
- menghubungkan provider dan service point;
- melihat evidence completeness;
- memperbaiki data administratif yang belum lengkap.

## 4.2 Healthcare Provider

**Tujuan:** mengonfirmasi service dan clinical event.

Kebutuhan:
- melihat episode yang ditugaskan;
- mencatat treatment;
- membuat atau mengonfirmasi clinical note;
- menyelesaikan service.

## 4.3 Reviewer / Auditor

**Tujuan:** memahami dan memprioritaskan kasus.

Kebutuhan:
- claim queue;
- evidence coverage;
- claim replay;
- evidence graph;
- AI explanation;
- potential claim impact;
- keputusan review.

## 4.4 Administrator

**Tujuan:** mengelola konfigurasi dan governance.

Kebutuhan:
- user/role management;
- service fingerprint;
- threshold dan rules;
- audit logs;
- monitoring sistem.

---

# 5. Product Scope

## 5.1 MVP Scope

### Included

- Authentication & RBAC
- Service Capture
- Service Passport
- Evidence Chain
- Expected Service Footprint
- Observed Evidence
- Claim Ingestion
- Service-to-Claim Reconciliation
- Evidence Coverage
- Proof Gap
- Episode Timeline / Replay
- Evidence Graph menggunakan Neo4j
- AI Evidence Reasoner
- Human Review Workspace
- Audit Log
- Synthetic Benchmark
- Demo Golden Case

### Optional / Experimental

- Service Signal dari computer vision
- Sensor/NFC integration
- Semantic Mutation Detection
- Claim Impact Simulation berbasis nominal synthetic

### Future

- Multi-service fingerprint
- Pilot integration
- Advanced temporal reasoning
- Pattern learning lintas episode
- Production-grade interoperability

---

# 6. Product Principles

## 6.1 Evidence First

Mulai dari service evidence, bukan sekadar claim score.

## 6.2 Missing Evidence ≠ Fraud

Tidak adanya evidence dapat disebabkan data belum sinkron, dokumentasi terlambat, atau sumber evidence lain belum tersedia.

## 6.3 Explain Before Escalate

Sebelum reviewer menerima priority flag, sistem harus menunjukkan alasan, evidence, gap, dan konteks.

## 6.4 Human-in-the-Loop

AI memberikan recommendation/support, reviewer menentukan keputusan akhir.

## 6.5 Provenance Matters

Setiap evidence harus memiliki sumber, timestamp, dan identifier yang dapat ditelusuri.

## 6.6 Prototype Honesty

Synthetic benchmark ≠ production validation. Prototype result ≠ real-world impact.

---

# 7. Functional Requirements

## FR-01 — Authentication

**Deskripsi:** pengguna dapat login ke SELARAS.

**Acceptance Criteria:**
- user dapat login dengan credential valid;
- user invalid ditolak;
- session memiliki role;
- protected routes tidak dapat dibuka tanpa autentikasi.

---

## FR-02 — Role-Based Access Control

### Roles

- ADMIN
- PROVIDER
- OPERATOR
- REVIEWER
- AUDITOR

**Acceptance Criteria:**
- setiap endpoint dilindungi berdasarkan role;
- reviewer tidak dapat mengubah konfigurasi system;
- operator tidak dapat mengambil keputusan review;
- audit log menyimpan perubahan otorisasi.

---

## FR-03 — Service Capture

User dapat membuat dan memulai episode pelayanan.

### Input

- patient synthetic ID;
- provider;
- facility;
- service type;
- service point;
- start timestamp.

### Output

`Service Event` dengan unique ID.

**Acceptance Criteria:**
- service ID unik;
- timestamp tercatat;
- provider dan patient terhubung;
- event masuk timeline episode.

---

## FR-04 — Service Completion

User dapat mengakhiri service.

### Input

- completion timestamp;
- treatment/procedure status;
- clinical note reference;
- completion status.

### Output

Service Passport diperbarui.

---

## FR-05 — Service Passport

Service Passport adalah ringkasan episode pelayanan.

### Minimal fields

```yaml
service_id
patient_id
facility_id
provider_id
service_type
start_at
end_at
service_status
evidence_count
evidence_coverage
passport_status
```

### Passport Status

- `IN_PROGRESS`
- `SUPPORTED`
- `INCOMPLETE`
- `REVIEW`
- `CLOSED`

**Acceptance Criteria:**
- passport dapat dibuka dari service list;
- seluruh evidence terkait dapat ditampilkan;
- status berubah mengikuti evidence state;
- perubahan status tercatat pada audit log.

---

# 8. Evidence Model

## 8.1 Evidence Types

### Identity Evidence
- patient verification
- provider identification

### Operational Evidence
- appointment
- arrival
- service start
- service end
- service point

### Clinical Evidence
- treatment
- procedure
- clinical note
- observation

### Administrative Evidence
- billing
- claim

### Derived Evidence
- AI signal
- CV service signal
- calculated consistency result

## 8.2 Evidence Schema

```yaml
id
service_id
evidence_type
source_type
source_id
observed_at
created_at
payload_hash
confidence
provenance
status
```

## 8.3 Evidence Status

- `FOUND`
- `MISSING`
- `CONFLICTING`
- `UNAVAILABLE`
- `LATE_ARRIVING`

---

# 9. Expected Service Footprint

Service fingerprint mendefinisikan bukti yang diharapkan untuk suatu jenis layanan.

## Example: Physiotherapy

```yaml
service_type: physiotherapy
required:
  - appointment
  - patient_arrival
  - provider_assignment
  - treatment_event
  - clinical_note
  - completion
supporting:
  - service_point
  - operational_signal
```

Expected footprint digunakan untuk:

1. menentukan evidence yang dicari;
2. menghitung coverage;
3. menghasilkan proof gap;
4. membantu service-specific reconciliation.

---

# 10. Service-to-Claim Reconciliation

## 10.1 Konsep

```text
Claim
  ↓
Expected Service Footprint
  ↓
Observed Service Evidence
  ↓
Reconciliation
  ↓
Match / Gap / Conflict
```

## 10.2 Reconciliation Checks

### Quantity Check

Claim quantity vs supported service count.

### Temporal Check

Claim/service timing vs episode timeline.

### Identity Check

Patient/provider/service identity alignment.

### Evidence Completeness

Required evidence tersedia atau tidak.

### Duplicate Check

Apakah service yang sama direpresentasikan lebih dari satu kali.

### Conflict Check

Evidence antar-source saling bertentangan atau tidak.

---

# 11. Evidence Coverage

Untuk prototype, coverage dapat dihitung sebagai indikator:

```text
Evidence Coverage
= supported required evidence / expected required evidence
```

Untuk aggregate service units:

```text
Service Support Coverage
= supported service units / claimed service units
```

**Catatan:** formula harus dapat dikonfigurasi per service fingerprint. Coverage bukan bukti fraud dan bukan skor probabilitas fraud.

---

# 12. Proof Gap Engine

Proof Gap adalah daftar evidence yang diharapkan namun belum ditemukan atau tidak konsisten.

### Example

```yaml
service_id: SRV-1025-09
claim_item: CLM-08421-09
gaps:
  - treatment_event
  - completion_event
severity: review
reason:
  - billing_present
  - claim_present
  - treatment_missing
```

Output UI:

> **Jejak pelayanan belum lengkap.**

---

# 13. Episode Timeline / Replay

## Tujuan

Membuat reviewer dapat melihat satu service episode sebagai timeline yang mudah dipahami.

## Timeline example

```text
09:02  Arrival       ✓
09:05  Provider      ✓
09:07  Treatment     ?
09:41  Completion    ?
09:44  Note          ✓
09:46  Billing       ✓
09:50  Claim         ✓
```

## Acceptance Criteria

- event diurutkan berdasarkan timestamp;
- user dapat memilih node;
- detail event ditampilkan;
- gap/conflict ditandai;
- replay tidak mengubah data asli.

---

# 14. Neo4j Evidence Graph

Neo4j digunakan untuk memodelkan hubungan kompleks antara patient, service, provider, evidence, billing, dan claim.

## 14.1 Node Types

```text
Patient
Facility
Provider
ServiceEpisode
Appointment
Encounter
Treatment
ClinicalNote
Observation
Billing
Claim
ClaimItem
Evidence
Review
```

## 14.2 Relationship Types

```text
(Patient)-[:HAS_EPISODE]->(ServiceEpisode)
(ServiceEpisode)-[:SCHEDULED_BY]->(Appointment)
(ServiceEpisode)-[:HAS_PROVIDER]->(Provider)
(ServiceEpisode)-[:HAS_TREATMENT]->(Treatment)
(ServiceEpisode)-[:HAS_NOTE]->(ClinicalNote)
(ServiceEpisode)-[:HAS_EVIDENCE]->(Evidence)
(ServiceEpisode)-[:GENERATES_BILLING]->(Billing)
(Billing)-[:SUPPORTS]->(ClaimItem)
(Claim)-[:CONTAINS]->(ClaimItem)
(Evidence)-[:SUPPORTS]->(ClaimItem)
(Evidence)-[:CONTRADICTS]->(ClaimItem)
(Review)-[:REVIEWS]->(Claim)
```

## 14.3 Example Cypher

```cypher
MATCH (s:ServiceEpisode {id: $serviceId})
OPTIONAL MATCH (s)-[r]->(n)
RETURN s, r, n
ORDER BY n.observed_at
```

## 14.4 Why Neo4j

- relationship-heavy evidence;
- episode traversal;
- evidence provenance;
- contradiction mapping;
- graph visualization;
- future support untuk pattern discovery.

## 14.5 Trade-off

Neo4j menambah kompleksitas deployment dan data synchronization. PostgreSQL tetap menjadi source of record untuk transactional data; Neo4j menjadi graph/read model untuk relationship analysis.

---

# 15. AI Evidence Reasoner

## 15.1 Tujuan

Memberikan explanation yang grounded pada evidence yang sudah terstruktur.

## 15.2 Input

```text
Claim representation
Evidence list
Proof gaps
Timeline
Reconciliation results
Potential impact
```

## 15.3 Output

```yaml
summary
what_changed
when
supporting_evidence
missing_evidence
conflicting_evidence
claim_impact
review_reason
limitations
```

## 15.4 Guardrails

AI tidak boleh:

- menyatakan “fraud terbukti”;
- membuat evidence;
- mengarang event yang tidak ada;
- memberikan diagnosis;
- mengubah source data;
- menutupi uncertainty.

AI harus menggunakan bahasa:

- perlu pemeriksaan;
- evidence belum lengkap;
- terdapat ketidaksesuaian;
- evidence tidak ditemukan;
- terdapat indikasi yang memerlukan verifikasi.

---

# 16. Risk Prioritization

SELARAS memprioritaskan kasus berdasarkan kombinasi sinyal, bukan satu angka tunggal.

## Candidate Features

- evidence coverage;
- missing critical evidence;
- contradiction count;
- temporal inconsistency;
- duplicate pattern;
- claim-service quantity mismatch;
- potential claim impact;
- repeated pattern.

## Output

- `CLEAR`
- `CORRECTION`
- `REVIEW`
- `HIGH_PRIORITY`

Setiap status wajib memiliki alasan.

---

# 17. Claim Impact Simulation

Jika synthetic dataset memiliki nominal, SELARAS dapat menunjukkan:

```text
Current Claim
Rp5.900.000

Evidence-supported scenario
Rp2.100.000

Potential Difference
Rp3.800.000
```

Label UI wajib:

> **Estimasi/simulasi dampak potensial — bukan kerugian aktual.**

## Counterfactual

Pertanyaan:

> “Bagaimana profil claim jika perubahan/mismatch tertentu tidak terjadi?”

Counterfactual hanya digunakan untuk membantu reasoning, bukan menetapkan kerugian resmi.

---

# 18. Review Workspace

## Layout

### Left
Claim summary + risk status.

### Center
Timeline / graph / evidence detail.

### Right
AI explanation + reviewer action.

## Review Actions

- `VERIFIED`
- `NEED_CLARIFICATION`
- `FOLLOW_UP`

## Review Note

Reviewer dapat menuliskan catatan.

## Audit Trail

Semua keputusan dicatat:

```yaml
review_id
reviewer_id
claim_id
decision
notes
created_at
```

---

# 19. Landing Page Requirements

## LP-01 Hero

Headline:

> **Setiap pelayanan meninggalkan bukti sebelum menjadi klaim.**

Subheadline:

> SELARAS membentuk bukti sejak titik pelayanan, merekonstruksi episode pelayanan, lalu memastikan jejak pelayanan tetap selaras dengan billing dan klaim.

CTA:

- `Lihat Cara Kerja`
- `Lihat Prototype`

## LP-02 Problem

> **A claim tells what was billed. SELARAS reconstructs what happened.**

Visual: 10 claimed → 8 supported → 2 review.

## LP-03 How It Works

Capture → Passport → Reconstruct → Reconcile.

## LP-04 Service Passport

Interactive mockup.

## LP-05 Golden Case

Interactive claim-to-evidence case.

## LP-06 AI Explanation

What / When / Evidence / Gap / Impact.

## LP-07 Scale

Physiotherapy → Radiology → Laboratory → Pharmacy → Medical Devices → Inpatient.

## LP-08 Governance

Privacy / RBAC / Human-in-loop / Provenance / Audit.

## LP-09 Final CTA

> **Make every service traceable.**

---

# 20. Application Information Architecture

```text
/
├── Overview
├── Service
│   ├── Live Service
│   └── Service Passport
├── Investigation
│   ├── Claim Queue
│   ├── Claim Detail
│   ├── Episode Replay
│   └── Evidence Graph
├── Analytics
│   ├── Evidence Coverage
│   ├── Review Analytics
│   └── Risk Patterns
└── System
    ├── Users & Roles
    ├── Service Templates
    └── Audit Log
```

---

# 21. UX / UI Design Principles

## Visual Direction

- premium health-tech;
- clean enterprise;
- high information density tetapi tidak padat;
- deep green + ivory + neutral;
- amber/red hanya untuk meaningful states;
- typography jelas;
- motion digunakan untuk state transition penting, bukan dekorasi.

## Design Rule

### Normal
Green / neutral.

### Incomplete
Amber.

### High Priority
Red.

### Verified
Green.

### AI
Tidak menggunakan warna seolah-olah AI adalah hakim; AI muncul sebagai assistant/explainer.

---

# 22. Tech Stack

## Frontend

- Next.js 16
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- Recharts
- Framer Motion

## Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy

## Primary Database

- PostgreSQL

## Graph Database

- Neo4j
- Neo4j Python Driver

## Cache / Queue

- Redis
- Celery / lightweight background workers bila diperlukan

## Auth

- Supabase Auth atau JWT-based authentication

## Storage

- S3-compatible storage / Supabase Storage

## AI

- LLM API
- optional embedding model
- rule engine + deterministic analytics

## Observability

- structured logs
- error tracking
- request tracing pada deployment lanjutan

## Deployment

- Vercel — frontend
- Railway/Render/Fly.io — backend
- Supabase/PostgreSQL — relational DB
- Neo4j Aura atau self-hosted Neo4j — graph

---

# 23. System Architecture

```text
                        USERS
                          │
                    ┌─────┴─────┐
                    │ Next.js   │
                    │ Web App   │
                    └─────┬─────┘
                          │ HTTPS
                    ┌─────▼─────┐
                    │ FastAPI   │
                    │ API       │
                    └─────┬─────┘
                          │
          ┌───────────────┼────────────────┐
          │               │                │
   ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
   │ PostgreSQL  │ │   Neo4j     │ │ Redis/Queue │
   └─────────────┘ └─────────────┘ └─────────────┘
          │               │                │
          └───────────────┼────────────────┘
                          │
                 ┌────────▼────────┐
                 │ Evidence Engine │
                 └────────┬────────┘
                          │
        ┌─────────────────┼──────────────────┐
        │                 │                  │
 ┌──────▼──────┐  ┌───────▼──────┐  ┌──────▼──────┐
 │ Reconcile   │  │ Risk Engine  │  │ AI Reasoner │
 └─────────────┘  └──────────────┘  └─────────────┘
```

---

# 24. Database Design — PostgreSQL

## Core tables

### users

```text
id
name
email
role
facility_id
created_at
updated_at
```

### facilities

```text
id
name
code
created_at
```

### providers

```text
id
facility_id
name
provider_type
status
```

### patients

```text
id
synthetic_identifier
facility_id
created_at
```

### service_episodes

```text
id
patient_id
provider_id
facility_id
service_type
started_at
ended_at
status
```

### service_events

```text
id
service_episode_id
event_type
occurred_at
actor_id
payload
```

### evidences

```text
id
service_episode_id
evidence_type
source_type
source_id
observed_at
status
confidence
provenance
```

### claims

```text
id
patient_id
facility_id
claim_number
submitted_at
status
```

### claim_items

```text
id
claim_id
service_type
quantity
nominal
service_date
```

### reconciliations

```text
id
claim_item_id
coverage
status
gap_count
conflict_count
potential_impact
created_at
```

### reviews

```text
id
claim_id
reviewer_id
decision
notes
created_at
```

### audit_logs

```text
id
actor_id
action
resource_type
resource_id
metadata
created_at
```

---

# 25. Neo4j Data Model

```text
(:Patient)-[:HAS_EPISODE]->(:ServiceEpisode)
(:ServiceEpisode)-[:HAS_EVENT]->(:ServiceEvent)
(:ServiceEpisode)-[:HAS_EVIDENCE]->(:Evidence)
(:ServiceEpisode)-[:HAS_PROVIDER]->(:Provider)
(:ServiceEpisode)-[:GENERATES_BILLING]->(:Billing)
(:Billing)-[:SUPPORTS]->(:ClaimItem)
(:Claim)-[:CONTAINS]->(:ClaimItem)
(:Evidence)-[:SUPPORTS]->(:ClaimItem)
(:Evidence)-[:CONTRADICTS]->(:ClaimItem)
(:Review)-[:REVIEWS]->(:Claim)
```

## Graph Query Use Cases

1. Menelusuri semua evidence untuk satu claim item.
2. Mencari gap pada satu service episode.
3. Menemukan contradiction antar evidence.
4. Menyusun subgraph untuk replay.
5. Menyiapkan basis pattern discovery pada fase lanjutan.

---

# 26. API Specification

## Authentication

```http
POST /api/v1/auth/login
```

## Service

```http
POST /api/v1/services
GET  /api/v1/services
GET  /api/v1/services/{service_id}
POST /api/v1/services/{service_id}/start
POST /api/v1/services/{service_id}/complete
```

## Evidence

```http
POST /api/v1/services/{service_id}/evidence
GET  /api/v1/services/{service_id}/evidence
GET  /api/v1/evidence/{evidence_id}
```

## Passport

```http
GET /api/v1/services/{service_id}/passport
```

## Claims

```http
POST /api/v1/claims
GET  /api/v1/claims
GET  /api/v1/claims/{claim_id}
POST /api/v1/claims/{claim_id}/reconcile
```

## Replay

```http
GET /api/v1/claims/{claim_id}/replay
```

## Graph

```http
GET /api/v1/services/{service_id}/graph
GET /api/v1/claims/{claim_id}/graph
```

## AI

```http
POST /api/v1/claims/{claim_id}/explain
```

## Review

```http
POST /api/v1/claims/{claim_id}/review
GET  /api/v1/reviews/{review_id}
```

---

# 27. Example API Payload

## Create Service

```json
{
  "patient_id": "P-1025",
  "facility_id": "FASKES-A",
  "provider_id": "T-031",
  "service_type": "physiotherapy",
  "service_point": "ROOM-03"
}
```

## Evidence

```json
{
  "service_episode_id": "SRV-1025-08",
  "evidence_type": "treatment_event",
  "source_type": "service_capture",
  "observed_at": "2026-09-29T14:07:00+07:00",
  "status": "FOUND",
  "provenance": {
    "source": "selaras-capture",
    "event_id": "EVT-9002"
  }
}
```

## Reconciliation result

```json
{
  "claim_id": "CLM-08421",
  "claimed_units": 10,
  "supported_units": 8,
  "evidence_coverage": 0.8,
  "proof_gap": 2,
  "status": "REVIEW",
  "reasons": [
    "Treatment evidence missing for two service units"
  ]
}
```

---

# 28. Synthetic Benchmark

## Dataset Structure

```text
synthetic-data/
├── patients.csv
├── providers.csv
├── services.csv
├── service_events.csv
├── clinical_notes.csv
├── billings.csv
├── claims.csv
├── risk_labels.csv
└── expected_outcomes.csv
```

## Risk Scenarios

### S01 — Normal

All required evidence available.

### S02 — Missing Treatment

Claim exists, treatment evidence missing.

### S03 — Missing Completion

Service starts but no completion event.

### S04 — Repeat Billing

Same episode represented multiple times.

### S05 — Quantity Mismatch

Claimed quantity > supported service quantity.

### S06 — Temporal Conflict

Claim/billing appears before service event.

### S07 — Duplicate Pattern

Two claim items map to same service.

### S08 — Contradictory Evidence

Different sources disagree.

---

# 29. Validation Plan

## Level 1 — Unit Testing

Test:

- service creation;
- evidence insertion;
- coverage calculation;
- reconciliation;
- graph traversal;
- review actions.

## Level 2 — Integration Testing

Test:

```text
Capture → Passport → Claim → Reconciliation → Review
```

## Level 3 — Synthetic Benchmark

Compare system output with known ground truth.

## Level 4 — Usability Test

Reviewer task completion:

> “Temukan mengapa claim CLM-08421 perlu diperiksa.”

Measure:

- task completion;
- time to answer;
- wrong navigation;
- perceived clarity.

---

# 30. KPI Framework

## Product KPI

### Evidence Coverage

`Supported service units / Claimed service units`

### Median Review Time

Median duration from case open to review decision.

### Reconstruction Time

Time required to understand one episode using SELARAS.

### Gap Detection Rate

Correctly identified synthetic gaps / total injected gaps.

### False Positive Rate

Incorrectly flagged normal synthetic cases / total normal cases.

## Governance KPI

- percentage of claims with provenance;
- percentage of AI explanations linked to evidence;
- percentage of review decisions with human actor;
- audit log completeness.

---

# 31. Landing Page UI Specification

## Section 01 — Hero

Headline:

> Setiap pelayanan meninggalkan bukti sebelum menjadi klaim.

Visual:

Service Passport card + moving evidence chain.

## Section 02 — Problem

10 claimed → 8 supported → 2 review.

## Section 03 — How It Works

Capture → Passport → Reconstruct → Reconcile.

## Section 04 — Service Passport

Interactive card.

## Section 05 — Golden Case

Claim → Gap → Replay.

## Section 06 — AI Explanation

What / When / Evidence / Gap / Impact.

## Section 07 — Scale

Service Fingerprint ecosystem.

## Section 08 — Governance

Privacy / RBAC / Audit / Human-in-loop.

## Section 09 — CTA

> Make every service traceable.

---

# 32. Application UI Specification

## Dashboard

Widgets:

- services today;
- evidence coverage;
- review queue;
- high priority cases;
- recent service episodes.

## Live Service

Primary action:

> **MULAI PELAYANAN**

Secondary:

> Selesaikan Pelayanan

## Service Passport

- service identity;
- evidence list;
- coverage;
- status;
- replay.

## Claim Queue

Columns:

- claim number;
- patient;
- service;
- claimed units;
- supported units;
- coverage;
- priority;
- action.

## Claim Detail

Tabs:

1. Overview
2. Evidence
3. Replay
4. Graph
5. AI Explanation
6. Impact
7. Review History

---

# 33. User Journey — Provider

```text
Login
  ↓
Today’s Services
  ↓
Open Patient
  ↓
Start Service
  ↓
Capture Treatment
  ↓
Add Clinical Note
  ↓
Complete Service
  ↓
Service Passport Updated
```

Success condition:

> provider can complete a service episode without switching to a separate technical workflow.

---

# 34. User Journey — Reviewer

```text
Login
  ↓
Claim Queue
  ↓
Select High Priority
  ↓
Claim Summary
  ↓
Evidence Coverage
  ↓
Replay
  ↓
Graph
  ↓
AI Explanation
  ↓
Potential Impact
  ↓
Review Decision
```

Success condition:

> reviewer can answer “why this case needs review?” from one workspace.

---

# 35. Golden Demo Flow

Target duration: **3–5 minutes**.

## Scene 1 — Start Service

Scan/select patient + provider + service.

## Scene 2 — Proof Created

Show Service Passport creation.

## Scene 3 — Claim Arrives

Show `10 claimed`.

## Scene 4 — Reconciliation

Show:

```text
10 claimed
8 supported
2 need review
```

## Scene 5 — Replay

Show timeline with missing treatment/completion.

## Scene 6 — Graph

Show evidence relationship.

## Scene 7 — AI Explanation

Show what / when / evidence / gap / why review.

## Scene 8 — Impact

Show synthetic potential difference if configured.

## Scene 9 — Human Review

Select `Need Clarification`.

---

# 36. “Wow Moment” Requirements

Prototype wajib memiliki minimal tiga momen visual kuat.

### WOW 01 — Service Passport

> **Service Passport Created**

### WOW 02 — Claim Meets Evidence

> **10 Claimed → 8 Supported → 2 Review**

### WOW 03 — Replay

> **Lihat bagaimana service episode terbentuk dan di mana jejaknya tidak lengkap.**

Optional WOW 04:

> **Counterfactual Claim Simulation**

---

# 37. Security

## Authentication

Secure session + token rotation bila production-ready.

## Authorization

RBAC.

## Data Encryption

TLS in transit + encryption at rest pada production.

## Secrets

Semua credential/keys disimpan melalui environment secret management.

## Audit

Semua perubahan keputusan reviewer dicatat.

## Evidence Integrity

Gunakan hash untuk mendeteksi perubahan payload evidence.

---

# 38. Privacy & Data Governance

## Prototype

Gunakan:

- synthetic patient ID;
- synthetic clinical note;
- synthetic claim;
- dummy evidence.

## Production Direction

- data minimization;
- purpose limitation;
- RBAC;
- auditability;
- provenance;
- retention policy;
- consent/authorization sesuai konteks hukum;
- PDP compliance.

SELARAS tidak menggunakan data peserta JKN riil tanpa izin resmi.

---

# 39. AI Governance

## Principle

> **AI recommends. Human decides.**

## Requirements

1. explanation harus evidence-grounded;
2. AI tidak boleh membuat source event;
3. AI harus menyebut uncertainty bila relevan;
4. decision final oleh manusia;
5. reviewer dapat override AI;
6. semua AI output disimpan bersama model/config version untuk audit pada tahap lanjut.

---

# 40. Accessibility & UX

Minimum:

- keyboard navigation;
- readable contrast;
- visible focus state;
- semantic labels;
- responsive layout;
- loading state;
- empty state;
- error state;
- confirmation untuk irreversible action.

---

# 41. Performance Requirements — Prototype

Target internal, bukan production SLA:

- dashboard initial load: < 3s pada demo environment;
- claim detail load: < 2s untuk synthetic dataset;
- reconciliation: < 5s untuk one golden case;
- graph rendering: < 5s untuk single episode;
- AI explanation: asynchronous UX bila API response lambat.

Jika target tidak tercapai, tampilkan loading/progress yang jelas daripada membuat UI tampak macet.

---

# 42. Error Handling

## Evidence service unavailable

UI:

> **Evidence source unavailable. Please verify later.**

Jangan otomatis mengubah menjadi `fraud`.

## Duplicate event

Tampilkan:

> **Possible duplicate event — review required.**

## AI unavailable

Core reconciliation harus tetap dapat berjalan.

AI adalah enhancement, bukan single point of failure.

---

# 43. Observability

Minimal:

- API logs;
- request ID;
- error logs;
- reconciliation execution time;
- AI response failure;
- graph query failure;
- audit action.

Dashboard developer/admin:

```text
API status
Neo4j status
PostgreSQL status
Redis status
AI provider status
```

---

# 44. Roadmap

## Phase 1 — Prototype Core

**0–2 bulan**

Deliverables:
- auth;
- service capture;
- service passport;
- evidence engine;
- claim reconciliation;
- replay;
- Neo4j graph;
- reviewer workspace.

## Phase 2 — Synthetic Validation

**2–4 bulan**

Deliverables:
- benchmark dataset;
- ground truth;
- injected risk patterns;
- detection report;
- usability test.

## Phase 3 — Pilot Readiness

**4–8 bulan**

Deliverables:
- RBAC hardening;
- audit log;
- provenance;
- security;
- data integration adapters.

## Phase 4 — Limited Pilot

**8–12 bulan**

Deliverables:
- one facility/unit;
- one service;
- reviewer study;
- impact measurement.

## Phase 5 — Multi-Service

**12–18 bulan**

Deliverables:
- radiology fingerprint;
- laboratory fingerprint;
- pharmacy fingerprint;
- medical device fingerprint.

## Phase 6 — Advanced Intelligence

**18–24 bulan**

Deliverables:
- semantic mutation detection;
- deeper temporal reasoning;
- pattern learning;
- counterfactual analysis.

## Phase 7 — Integration Readiness

**24+ bulan**

Deliverables:
- interoperability;
- monitoring;
- production controls;
- multi-facility readiness.

---

# 45. Development Sprint Plan

## Sprint 1 — Foundation

- monorepo;
- auth;
- PostgreSQL;
- Neo4j;
- API skeleton;
- design system.

## Sprint 2 — Service Capture

- patient selector;
- provider;
- service;
- start/end service;
- events.

## Sprint 3 — Service Passport

- passport view;
- evidence list;
- coverage;
- status engine.

## Sprint 4 — Claim Reconciliation

- claim ingestion;
- expected footprint;
- observed evidence;
- gap engine.

## Sprint 5 — Replay + Graph

- timeline;
- Neo4j traversal;
- graph UI.

## Sprint 6 — AI

- explanation prompt;
- evidence-grounded summary;
- review priority.

## Sprint 7 — Impact + Governance

- counterfactual demo;
- review actions;
- audit logs.

## Sprint 8 — Demo Hardening

- seeded data;
- fixed golden case;
- error handling;
- loading state;
- visual polish;
- rehearsal.

---

# 46. Repository Structure

```text
selaras/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   └── styles/
│   └── api/
│       ├── app/
│       │   ├── api/
│       │   ├── models/
│       │   ├── schemas/
│       │   ├── services/
│       │   ├── evidence/
│       │   ├── reconciliation/
│       │   ├── graph/
│       │   ├── ai/
│       │   └── audit/
│       └── tests/
│
├── packages/
│   ├── ui/
│   ├── types/
│   └── config/
│
├── data/
│   ├── synthetic/
│   ├── scenarios/
│   └── benchmark/
│
├── neo4j/
│   ├── constraints/
│   ├── indexes/
│   └── seed/
│
├── docs/
│   ├── architecture/
│   ├── governance/
│   └── api/
│
├── docker-compose.yml
├── README.md
└── .env.example
```

---

# 47. Environment Variables

```env
DATABASE_URL=
NEO4J_URI=
NEO4J_USERNAME=
NEO4J_PASSWORD=
REDIS_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
AI_API_KEY=
STORAGE_ENDPOINT=
STORAGE_BUCKET=
JWT_SECRET=
```

Secrets wajib dikelola melalui environment/secret manager dan tidak boleh masuk repository.

---

# 48. Definition of Done — MVP

MVP dianggap selesai jika:

### Service Capture
- [ ] operator dapat membuat service episode;
- [ ] start/end tercatat;
- [ ] provider dan patient terhubung.

### Service Passport
- [ ] passport otomatis dibuat;
- [ ] evidence dapat ditampilkan;
- [ ] coverage dihitung.

### Reconciliation
- [ ] claim dapat diinput;
- [ ] expected footprint dicocokkan;
- [ ] gap terdeteksi;
- [ ] status review dihasilkan.

### Replay
- [ ] timeline tersedia;
- [ ] user dapat membuka detail event.

### Neo4j
- [ ] episode dapat direpresentasikan sebagai graph;
- [ ] claim-to-evidence traversal berfungsi.

### AI
- [ ] explanation dapat dibuat;
- [ ] explanation hanya memakai evidence yang tersedia;
- [ ] AI tidak mengeluarkan vonis fraud.

### Review
- [ ] reviewer dapat memilih decision;
- [ ] decision tersimpan;
- [ ] audit log dibuat.

### Demo
- [ ] golden case berjalan end-to-end tanpa data manual tambahan;
- [ ] flow dapat selesai < 5 menit;
- [ ] state utama jelas secara visual.

---

# 49. Acceptance Test — Golden Case

## Given

Synthetic claim `CLM-08421` berisi 10 sesi fisioterapi.

Service evidence hanya mendukung 8 sesi secara lengkap.

## When

Reviewer membuka claim.

## Then

SELARAS menampilkan:

```text
10 Claimed
8 Supported
2 Need Review
```

Reviewer membuka sesi 9.

System menampilkan:

```text
Arrival ✓
Provider ✓
Treatment ?
Note ✓
Billing ✓
Claim ✓
```

Reviewer membuka replay.

System memperlihatkan treatment event sebagai missing/unavailable sesuai dataset.

AI memberikan explanation evidence-grounded.

Reviewer memilih `Need Clarification`.

Review tersimpan dan muncul pada audit log.

---

# 50. Product Metrics Dashboard

## Operations

- services today;
- service completion rate;
- incomplete passport;
- evidence coverage.

## Investigation

- claims reviewed;
- review queue;
- high priority cases;
- average review time.

## Evidence

- evidence type frequency;
- missing evidence rate;
- contradiction count.

## AI

- explanation generation success;
- grounded explanation rate pada benchmark;
- override rate oleh reviewer.

---

# 51. Scalability Architecture

## Service Fingerprint Registry

Setiap service template memiliki:

```yaml
service_type
version
expected_events
required_evidence
supporting_evidence
reconciliation_rules
claim_mapping
```

Contoh:

```text
physiotherapy-v1
radiology-v1
laboratory-v1
pharmacy-v1
```

Dengan model ini, core engine tetap sama sedangkan fingerprint dapat ditambahkan secara modular.

---

# 52. Future Advanced Modules

## 52.1 Service Signal

Integrasi event dari device/sensor/CV sebagai evidence pendukung.

## 52.2 Semantic Mutation Detection

Mendeteksi perubahan bermakna pada diagnosis, procedure, coding, medication, documentation, dan claim amount.

## 52.3 Pattern Intelligence

Mencari pola berulang lintas episode/fasilitas.

## 52.4 Network-Level Graph

Menganalisis relasi lebih luas antar provider, service, facility, dan claim pattern setelah governance memadai.

## 52.5 Counterfactual Review

Memberikan scenario comparison untuk membantu reviewer memahami impact.

---

# 53. Risks & Mitigations

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Missing evidence | False concern | Missing ≠ fraud; manual verification |
| False positive | Review overload | threshold calibration + reviewer feedback |
| LLM hallucination | Salah interpretasi | evidence-grounded prompt + schema-constrained output |
| Graph inconsistency | Incorrect traversal | PostgreSQL source of truth + sync validation |
| Data latency | False gap | timestamp + late-arriving status |
| Integration complexity | Deployment delay | adapter/middleware architecture |
| Privacy breach | High | RBAC + encryption + minimization |
| Prototype overclaim | Credibility loss | label synthetic/experimental clearly |
| Feature creep | Delivery delay | lock MVP scope |

---

# 54. Important Product Constraints

1. **No real JKN data without official authorization.**
2. **No automatic fraud verdict.**
3. **No fabricated metrics.**
4. **No claim that prototype equals production.**
5. **No clinical diagnosis from Service Signal.**
6. **No dependency on LLM for deterministic calculations.**
7. **Neo4j is analytical/relationship layer; PostgreSQL remains transactional source of record.**
8. **MVP remains focused on one hero problem.**

---

# 55. Final Product Definition

## SELARAS

**Sistem Evaluasi Layanan & Rekam Administrasi untuk Risiko Klaim**

### Core idea

> **Setiap pelayanan meninggalkan bukti sebelum menjadi klaim.**

### Product thesis

> **Klaim adalah pernyataan. SELARAS membangun dan menyusun buktinya sejak pelayanan terjadi.**

### Main workflow

```text
SERVICE
  ↓
CAPTURE
  ↓
SERVICE PASSPORT
  ↓
EVIDENCE GRAPH
  ↓
EPISODE RECONSTRUCTION
  ↓
SERVICE ↔ CLAIM RECONCILIATION
  ↓
GAP / CONFLICT / IMPACT
  ↓
AI EVIDENCE REASONER
  ↓
HUMAN REVIEW
```

### MVP

**Physiotherapy Service Integrity**

### Hero risk

**Phantom & Repeat Billing**

### Technology differentiator

**Point-of-Care Evidence + Service Passport + Neo4j Evidence Graph + Explainable Reconciliation**

### Long-term vision

> **SELARAS menjadi evidence and service integrity layer yang dapat diterapkan lintas jenis layanan kesehatan dalam ekosistem JKN.**

---

# 56. Source Notes

Dokumen ini menggunakan istilah dan batasan dari panduan resmi Healthkathon 2026, terutama:

- satu kategori dan satu solusi;
- komponen wajib proposal;
- enam dimensi penilaian;
- kategori risiko fasilitas kesehatan;
- prototype maturity;
- impact measurement;
- privacy/PDP;
- AI limitations;
- human-in-the-loop.

Untuk klaim faktual eksternal, gunakan sumber resmi atau primer pada proposal final. Angka synthetic pada PRD ini merupakan data desain/testing dan **bukan data operasional JKN**.

---

# 57. Final Development Priority

## Priority 0 — Wajib

```text
Service Capture
→ Service Passport
→ Claim Reconciliation
→ Replay
→ Review
```

## Priority 1 — Wow Demo

```text
Neo4j Evidence Graph
→ AI Evidence Reasoner
→ Counterfactual Impact
```

## Priority 2 — Roadmap

```text
Service Signal
→ Semantic Mutation
→ Multi-Service Fingerprint
→ Pilot
→ Integration
```

---

## Closing

> **SELARAS tidak menunggu klaim bermasalah untuk mencari bukti. SELARAS membentuk bukti ketika pelayanan terjadi, merekonstruksi cerita pelayanan, lalu memastikan cerita tersebut tetap selaras hingga menjadi klaim.**

> **Apa yang dilayani harus selaras dengan apa yang diklaim.**
