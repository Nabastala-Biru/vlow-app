# Personal Task Vault (Vlow)

Aplikasi manajemen tugas pribadi berbasis papan Kanban (*drag-and-drop*) yang membagi fokus eksekusi ke dalam **6 horizon waktu**—mulai dari rutinitas harian hingga target tahunan. Seluruh data dilindungi di balik gerbang autentikasi **Master Password** dan mendukung fitur berbagi progres secara *read-only*.

---

## Fitur Utama

- **6 Horizon Waktu:** Mengorganisasi tugas secara terpisah namun terhubung untuk rentang **Harian**, **Mingguan**, **Bulanan**, **Per 3 Bulan**, **Per 6 Bulan**, dan **1 Tahun**.
- **Keamanan Berlapis (Vault Architecture):**
  - Autentikasi **Master Password** berbasis hash `bcrypt` (disimpan dalam format Base64 di *environment variables*).
  - Manajemen sesi menggunakan **JWT (`jose`)** di dalam `HttpOnly` cookie dan pencegahan akses di tingkat jaringan (`proxy.ts`).
  - Database terkunci menggunakan **Row Level Security (RLS)** di Supabase sehingga seluruh akses publik otomatis ditolak.
- **Parent-Child Goal Linking:** Menautkan tugas eksekusi harian atau mingguan ke sasaran jangka panjang beserta indikator rasio penyelesaian sub-tugas.
- **Read-Only Vault Sharing:** Membuat tautan publik (`/share/[token]`) yang dapat dicabut atau di-reset kapan saja agar orang lain hanya dapat melihat progres tanpa hak ubah maupun hapus.
- **Alat Bantu Produktivitas:**
  - *Progress bar* otomatis pada setiap tab rentang waktu dan fitur arsip tugas selesai (*Cycle Reset*).
  - Level prioritas (`Low`, `Medium`, `High`), pencarian instan, dan penanda tenggat waktu otomatis (*overdue* dan jatuh tempo hari ini).
  - Dukungan **Mode Siang & Malam** (*Light / Dark Mode*) serta pintasan keyboard (`N` untuk tugas baru, `/` untuk pencarian).

---

## Tech Stack

- **Framework:** Next.js (App Router & Server Actions)
- **Bahasa:** TypeScript
- **Antarmuka:** Tailwind CSS & Lucide Icons
- **Database & Keamanan:** Supabase (PostgreSQL + RLS), `bcryptjs`, `jose`
- **Hosting:** Vercel

---

## Struktur Proyek

```text
src/
├── app/
│   ├── actions/
│   │   ├── share.ts          # Server actions untuk manajemen link read-only
│   │   └── tasks.ts          # Server actions untuk CRUD & arsip tugas
│   ├── login/
│   │   ├── actions.ts        # Verifikasi Master Password & pembuatan cookie sesi
│   │   └── page.tsx          # Halaman gerbang kunci Vault
│   ├── share/[token]/
│   │   └── page.tsx          # Halaman tampilan publik read-only
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx              # Halaman utama papan Kanban
├── components/
│   ├── KanbanBoard.tsx       # Papan Kanban interaktif (Owner)
│   └── SharedKanbanBoard.tsx # Papan Kanban read-only (Pengunjung)
├── lib/
│   ├── auth.ts               # Utilitas enkripsi & verifikasi token JWT
│   └── supabase.ts           # Koneksi server-only Supabase Admin
├── types/
│   └── task.ts               # Definisi tipe data & konfigurasi horizon
└── proxy.ts                  # Pencegat rute untuk memproteksi akses belum terautentikasi
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
Buat proyek baru di [Supabase](https://supabase.com), buka **SQL Editor**, lalu jalankan skema berikut:

```sql
-- Tabel utama tugas lintas horizon waktu
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  horizon TEXT NOT NULL CHECK (horizon IN ('daily', 'weekly', 'monthly', 'quarterly', 'biannual', 'yearly')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_horizon_status ON tasks(horizon, status);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Tabel konfigurasi berbagi (Read-Only)
CREATE TABLE vault_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  share_enabled BOOLEAN NOT NULL DEFAULT false,
  share_token TEXT UNIQUE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO vault_settings (id, share_enabled, share_token)
VALUES (1, false, NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE vault_settings ENABLE ROW LEVEL SECURITY;
```

### 3. Generate Master Password Hash
Jalankan perintah berikut di terminal untuk menghasilkan hash password berformat Base64:

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
```

### 5. Jalankan di Lokal
```bash
npm run dev
```
Buka `http://localhost:3000` di browser dan masukkan **Master Password** untuk membuka papan tugas.

---

## Deployment ke Vercel

1. Unggah kode ke repositori **Private** di GitHub (pastikan `.env.local` tidak ikut terunggah).
2. Impor repositori ke [Vercel](https://vercel.com).
3. Tambahkan keempat variabel lingkungan (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MASTER_PASSWORD_B64`, `SESSION_SECRET`) pada pengaturan **Environment Variables** proyek Vercel.
4. Klik **Deploy**.