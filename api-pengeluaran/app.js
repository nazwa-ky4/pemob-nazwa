import express from 'express';
import cors from 'cors';
import pengeluaranRoutes from './routes/pengeluaran.js';
import { pool } from './db.js'; // Tambahkan import pool

const app = express();

app.use(cors());
app.use(express.json());

// Route kategori untuk pilihan form frontend
app.get('/kategori', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nama FROM kategori ORDER BY nama'
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ pesan: 'Gagal mengambil kategori' });
  }
});

app.use('/pengeluaran', pengeluaranRoutes);

export default app;

