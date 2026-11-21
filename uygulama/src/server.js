const express = require('express');
const cookieParser = require('cookie-parser');
const { yazmaHavuzu, okumaHavuzu } = require('./config/veritabani');
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const rezervasyonRoutes = require('./routes/rezervasyonRoutes');
const yoneticiRoutes = require('./routes/yoneticiRoutes');

const app = express();
const PORT = Number(process.env.PORT || 8000);

app.use(express.json());
app.use(cookieParser());

app.get('/api/', async (req, res) => {
  try {
    const [[yazma]] = await yazmaHavuzu.query('SELECT @@server_id AS id, @@read_only AS salt_okunur');
    const [[okuma]] = await okumaHavuzu.query('SELECT @@server_id AS id, @@read_only AS salt_okunur');
    res.json({ durum: 'ok', primary: yazma, replica: okuma });
  } catch (err) {
    console.error(err);
    res.status(500).json({ hata: 'Veritabanına bağlanılamadı.' });
  }
});

app.use('/api', authRoutes);
app.use('/api/menuler', menuRoutes);
app.use('/api/rezervasyonlar', rezervasyonRoutes);
app.use('/api/yonetici', yoneticiRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ hata: 'İstenen uç nokta bulunamadı.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Yemekhane API ${PORT} portunda çalışıyor.`);
});