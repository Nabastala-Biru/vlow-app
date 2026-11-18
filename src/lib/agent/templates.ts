const WEEKDAY_TEMPLATES = [
  'Jadwal hari ini masih kosong. Beneran tidak ada pekerjaan kantor atau tugas harian hari ini?',
  'Cek jadwal: belum ada task di kolom Harian. Hari ini memang kosong atau ada kerjaan yang belum dicatat?',
  'Halo Favian, daftar tugas hari ini masih bersih. Ada target harian yang mau dikerjakan hari ini?',
  'Pengecekan rutin: kolom Harian kosong. Konfirmasi dong, hari ini memang libur/kosong atau ada tugas?',
];

const WEEKEND_TEMPLATES = [
  'Weekend nih, jadwal harian kosong. Ada garapan freelance atau project sampingan hari ini, atau full istirahat?',
  'Hari libur akhir pekan! Belum ada task tercatat. Mau ngerjain side-project/freelance hari ini atau off dulu?',
  'Cek jadwal weekend: kosong. Beneran santai hari ini atau ada target pribadi yang mau dicicil?',
];

export function getRandomReminderTemplate(isWeekend: boolean): string {
  const list = isWeekend ? WEEKEND_TEMPLATES : WEEKDAY_TEMPLATES;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

export function getTodayWIB(): { dateStr: string; isWeekend: boolean; dayName: string } {
  const now = new Date();
  const wibStr = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const wibDate = new Date(wibStr);

  const year = wibDate.getFullYear();
  const month = String(wibDate.getMonth() + 1).padStart(2, '0');
  const day = String(wibDate.getDate()).padStart(2, '0');
  const dayOfWeek = wibDate.getDay(); // 0 = Minggu, 6 = Sabtu

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  return {
    dateStr: `${year}-${month}-${day}`,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    dayName: dayNames[dayOfWeek],
  };
}