'use server';

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_NAME, createSessionToken } from '@/lib/auth';

export async function unlockVault(prevState: { error?: string } | null, formData: FormData) {
  const password = (formData.get('password') as string)?.trim();
  const hashBase64 = process.env.MASTER_PASSWORD_B64?.trim();
  const sessionSecret = process.env.SESSION_SECRET?.trim();

  if (!hashBase64) {
    return { error: 'Variabel MASTER_PASSWORD_B64 belum terbaca. Pastikan sudah ada di .env.local dan restart server.' };
  }

  if (!sessionSecret || sessionSecret.length < 16) {
    return { error: 'Variabel SESSION_SECRET belum diisi di .env.local (minimal 16 karakter).' };
  }

  if (!password) {
    return { error: 'Password tidak boleh kosong.' };
  }

  // Decode Base64 kembali menjadi hash bcrypt asli ($2b$12$...)
  const decodedHash = Buffer.from(hashBase64, 'base64').toString('utf-8');

  if (!decodedHash.startsWith('$2')) {
    return { error: 'Format MASTER_PASSWORD_B64 tidak valid. Buat ulang kode Base64-nya.' };
  }

  await new Promise((resolve) => setTimeout(resolve, 400));

  const isMatch = await bcrypt.compare(password, decodedHash);

  if (!isMatch) {
    return { error: 'Akses ditolak. Master Password salah.' };
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  redirect('/');
}