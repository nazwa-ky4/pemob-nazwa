/**
 * PENGATURAN API BACKEND
 * Mengambil URL dari .env dan menyediakan fallback jika .env tidak terbaca.
 */

// 1. Ambil URL dari .env atau gunakan IP fallback langsung
const RAW_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.188.86:3000';

// 2. Bersihkan URL dari spasi tidak sengaja (.trim()) dan hapus garis miring di akhir (/$)
const BASE_URL = RAW_URL.trim().replace(/\/$/, '');

/**
 * FUNGSI UTAMA HELPER FETCH REQUEST
 * Menangani pengiriman request HTTP ke server dan mengolah respon JSON.
 */
export async function request(path, options = {}) {
  if (!BASE_URL) {
    throw new Error('Alamat BASE_URL API tidak ditemukan.');
  }

  // Gabungkan URL dasar dengan endpoint path
  const url = `${BASE_URL}${path}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // Parsing hasil response ke bentuk JSON
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error((data && (data.pesan || data.message)) || `HTTP Error ${res.status}`);
    }

    return data;
  } catch (err) {
    // Tangani kesalahan jaringan / kegagalan koneksi
    throw new Error(err.message || 'Gagal terhubung ke server');
  }
}

/**
 * MODUL OPERASI API (CRUD Pengeluaran)
 */
export const api = {
  // Mengambil seluruh daftar pengeluaran
  list: () => request('/pengeluaran'),

  // Mengambil detail 1 pengeluaran berdasarkan ID
  detail: (id) => request(`/pengeluaran/${id}`),

  // Mengambil daftar kategori
  categories: () => request('/kategori'),

  // Menambah data pengeluaran baru
  create: (data) =>
    request('/pengeluaran', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Memperbarui data pengeluaran berdasarkan ID
  update: (id, data) =>
    request(`/pengeluaran/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Menghapus data pengeluaran berdasarkan ID
  remove: (id) =>
    request(`/pengeluaran/${id}`, {
      method: 'DELETE',
    }),
};