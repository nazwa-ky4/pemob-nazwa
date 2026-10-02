import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// 1. GET seluruh data pengeluaran (Modul Langkah 12)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.judul, p.nominal, p.tanggal, k.nama AS kategori
      FROM pengeluaran p
      LEFT JOIN kategori k ON p.id_kategori = k.id
      ORDER BY p.tanggal DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ pesan: 'Gagal mengambil data' });
  }
});

// 2. GET satu data pengeluaran berdasarkan ID (Modul Langkah 13)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM pengeluaran WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ pesan: 'Data tidak ditemukan' });
    }
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ pesan: 'Gagal mengambil data' });
  }
});

// 3. POST tambah data pengeluaran (Modul Langkah 14)
router.post('/', async (req, res) => {
  const { judul, nominal, id_kategori } = req.body;
  if (!judul || !nominal) {
    return res.status(400).json({ pesan: 'judul & nominal wajib diisi' });
  }

  try {
    const [hasil] = await pool.query(
      'INSERT INTO pengeluaran (judul, nominal, id_kategori) VALUES (?, ?, ?)',
      [judul, Number(nominal), id_kategori ?? null]
    );
    res.status(201).json({ id: hasil.insertId, judul, nominal: Number(nominal) });
  } catch (e) {
    res.status(500).json({ pesan: 'Gagal menyimpan data' });
  }
});

// 4. PUT ubah data pengeluaran (Modul Langkah 14)
router.put('/:id', async (req, res) => {
  const { judul, nominal } = req.body;
  try {
    const [hasil] = await pool.query(
      'UPDATE pengeluaran SET judul = ?, nominal = ? WHERE id = ?',
      [judul, Number(nominal), req.params.id]
    );
    if (hasil.affectedRows === 0) {
      return res.status(404).json({ pesan: 'Data tidak ditemukan' });
    }
    res.json({ id: Number(req.params.id), judul, nominal: Number(nominal) });
  } catch (e) {
    res.status(500).json({ pesan: 'Gagal memperbarui data' });
  }
});

// 5. DELETE hapus data pengeluaran (Modul Langkah 14)
router.delete('/:id', async (req, res) => {
  try {
    const [hasil] = await pool.query(
      'DELETE FROM pengeluaran WHERE id = ?',
      [req.params.id]
    );
    if (hasil.affectedRows === 0) {
      return res.status(404).json({ pesan: 'Data tidak ditemukan' });
    }
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ pesan: 'Gagal menghapus data' });
  }
});

export default router;