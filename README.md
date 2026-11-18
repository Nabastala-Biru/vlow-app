# Vlow Vault (Personal Task Tracker)

Aplikasi manajemen tugas pribadi berbasis papan Kanban (*drag-and-drop* / seret dan lepas) yang membagi fokus eksekusi ke dalam **5 horizon waktu bertahap**—mulai dari rutinitas harian hingga target tahunan. Dilengkapi asisten AI (*Artificial Intelligence* / kecerdasan buatan) untuk pencatatan jadwal harian otomatis, pelacak *streak* (konsistensi beruntun), serta proteksi **Master Password** (kata sandi utama).

---

## Fitur Utama

- **5 Horizon Waktu & Progressive Unlock (Pembukaan Bertahap):**
  - Mengorganisasi tugas dalam rentang **Harian**, **Mingguan**, **Bulanan**, **Per 3 Bulan**, dan **1 Tahun**.
  - Horizon **Per 3 Bulan** terbuka otomatis setelah menyelesaikan minimal 3 tugas **Bulanan**, dan **1 Tahun** terbuka setelah horizon **Per 3 Bulan** terisi.
- **Vlow Assistant (AI Daily Check-in & Task Logger):**
  - Terintegrasi dengan **Groq** (`openai/gpt-oss-20b`) melalui *Vercel AI SDK* untuk mencatat tugas harian langsung lewat obrolan (`addDailyTask`) maupun menandai hari libur (`confirmFreeDay`).
  - Mendukung pengingat otomatis terjadwal (*cron job* / tugas terjadwal otomatis) serta indikator status **Hari Libur** di *header* (bagian atas layar) yang permanen di akhir pekan dan otomatis hilang saat tugas hari kerja baru dibuat.
- **Daily Streak & Rekap Tahunan:**
  - Pelacakan *streak* harian 7 hari terakhir beserta rekor beruntun terbaik berdasarkan penyelesaian tugas harian tepat waktu.
  - Modal **Rekap Tahunan** untuk meninjau statistik penyelesaian dan tonggak capaian (*milestones*) sepanjang tahun.
- **Catatan Progres & Parent-Child Goal Linking:**
  - Setiap kartu dilengkapi modal catatan khusus untuk mencatat **Apa yang Sudah Dilakukan** dan **Kendala / Hal yang Perlu Diriset**.
  - Menautkan tugas eksekusi jangka pendek ke target jangka panjang dengan indikator rasio sub-tugas selesai dan rentang tanggal otomatis.
- **Arsip Tugas & Read-Only Vault Sharing:**
  - Fitur arsip tugas selesai dengan opsi pemulihan kembali ke papan aktif (*To Do* atau *Done*).
  - Tautan publik (`/share/[token]`) yang dapat diatur ulang atau dimatikan kapan saja agar orang lain hanya dapat melihat (*read-only* / hanya baca) progres tanpa hak ubah.
- **Keamanan Berlapis (Vault Architecture):**
  - Autentikasi **Master Password** berbasis hash `bcrypt` dalam format Base64.
  - Sesi berbasis **JWT (`jose`)** di dalam `HttpOnly` cookie dan pencegahan akses di tingkat jaringan (`proxy.ts`).
  - Database terkunci menggunakan **Row Level Security (RLS)** (keamanan tingkat baris) di Supabase.
- **Pengalaman Pengguna & Pintasan:**
  - Dukungan **Mode Siang & Malam** (*Light / Dark Mode*), gestur usap (*swipe*) kartu di perangkat *mobile* (ponsel), animasi transisi ringan, serta pintasan keyboard (`N` untuk tugas baru, `/` untuk pencarian).

---

## Tech Stack (Teknologi yang Digunakan)

- **Framework (Kerangka Kerja):** Next.js 16 (App Router & Server Actions)
- **Bahasa:** TypeScript
- **Antarmuka:** Tailwind CSS v4 & Lucide Icons
- **AI & Tool Calling:** Vercel AI SDK (`ai`), `@ai-sdk/groq`, `zod`
- **Database & Keamanan:** Supabase (PostgreSQL + RLS), `bcryptjs`, `jose`
- **Hosting:** Vercel

---

## Struktur Proyek

```text
src/
├── app/
│   ├── actions/
│   │   ├── agent.ts              # Server actions untuk riwayat chat & status libur harian
│   │   ├── share.ts              # Server actions untuk manajemen tautan read-only
│   │   └── tasks.ts              # Server actions untuk CRUD, catatan, & arsip tugas
│   ├── api/
│   │   └── agent/
│   │       ├── chat/route.ts     # Endpoint AI chat & eksekusi tool asisten
│   │       └── cron/route.ts     # Endpoint pengingat otomatis terjadwal
│   ├── login/
│   │   ├── actions.ts            # Verifikasi Master Password & pembuatan cookie sesi
│   │   └── page.tsx              # Halaman gerbang kunci Vault
│   ├── share/[token]/
│   │   └── page.tsx              # Halaman tampilan publik read-only
│   ├── globals.css               # Styling global & keyframes animasi UI
│   ├── layout.tsx
│   └── page.tsx                  # Halaman utama papan Kanban
├── components/
│   ├── AgentDrawer.tsx           # Panel samping obrolan Vlow Assistant
│   ├── KanbanBoard.tsx           # Papan Kanban interaktif (Owner)
│   ├── SharedKanbanBoard.tsx     # Papan Kanban read-only (Pengunjung)
│   ├── VaultPickers.tsx          # Komponen pemilih tanggal, bulan, & dropdown kustom
│   └── YearlyRecapModal.tsx      # Modal statistik & rekap pencapaian tahunan
├── lib/
│   ├── agent/
│   │   ├── templates.ts          # Utilitas waktu WIB & template pesan pengingat
│   │   └── tools.ts              # Definisi tool AI (addDailyTask & confirmFreeDay)
│   ├── auth.ts                   # Utilitas enkripsi & verifikasi token JWT
│   └── supabase.ts               # Koneksi server-only Supabase Admin
├── types/
│   └── task.ts                   # Definisi tipe data, horizon, & kalkulasi rentang waktu
└── proxy.ts                      # Pencegat rute untuk memproteksi akses belum terautentikasi
```

---

## Panduan Instalasi & Setup

### 1. Clone Repositori & Instal Dependensi
```bash
git clone [https://github.com/](https://github.com/)<username>/<nama-repo>.git
cd <nama-repo>
npm install
```

### 2. Setup Database Supabase
Buat proyek baru di [Supabase](https://supabase.com), buka **SQL Editor**, lalu jalankan skema lengkap berikut:

```sql
-- 1. Tabel utama tugas lintas horizon waktu
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  horizon TEXT NOT NULL CHECK (horizon IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  start_date DATE,
  target_date DATE,
  target_months TEXT[] DEFAULT '{}',
  progress_notes TEXT,
  blocker_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_horizon_status ON tasks(horizon, status);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 2. Tabel konfigurasi berbagi (Read-Only)
CREATE TABLE IF NOT EXISTS vault_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  share_enabled BOOLEAN NOT NULL DEFAULT false,
  share_token TEXT UNIQUE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO vault_settings (id, share_enabled, share_token)
VALUES (1, false, NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE vault_settings ENABLE ROW LEVEL SECURITY;

-- 3. Tabel status check-in & konfirmasi hari libur harian
CREATE TABLE IF NOT EXISTS daily_checkins (
  date DATE PRIMARY KEY,
  is_confirmed_free BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- 4. Tabel riwayat obrolan Vlow Assistant
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('assistant', 'user')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
```

### 3. Generate Master Password Hash
Jalankan perintah berikut di terminal untuk menghasilkan *hash* (sandi terenkripsi) password berformat Base64:

```bash
node -e "const h = require('bcryptjs').hashSync('GantiDenganPasswordKuat', 12); console.log('MASTER_PASSWORD_B64=' + Buffer.from(h).toString('base64'));"
```

### 4. Konfigurasi Environment Variables
Buat file `.env.local` di direktori utama proyek dan isi variabel berikut:

```env
SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
MASTER_PASSWORD_B64=hasil-base64-dari-langkah-3
SESSION_SECRET=kombinasi-karakter-acak-minimal-32-karakter
GROQ_API_KEY=gsk_your_groq_api_key
CRON_SECRET=kombinasi-rahasia-untuk-endpoint-cron
```

### 5. Jalankan di Lokal
```bash
npm run dev
```
Buka `http://localhost:3000` di *browser* (peramban) dan masukkan **Master Password** untuk membuka papan tugas.

---

## Deployment ke Vercel

1. Unggah kode ke repositori **Private** di GitHub (pastikan `.env.local` tidak ikut terunggah).
2. Impor repositori ke [Vercel](https://vercel.com).
3. Tambahkan keenam variabel lingkungan (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MASTER_PASSWORD_B64`, `SESSION_SECRET`, `GROQ_API_KEY`, `CRON_SECRET`) pada pengaturan **Environment Variables** proyek Vercel.
4. Klik **Deploy**.