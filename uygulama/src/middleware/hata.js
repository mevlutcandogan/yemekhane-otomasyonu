function hataYakala(err, res) {
  if (err && (err.sqlState === '45000' || err.errno === 1644)) {
    return res.status(400).json({ hata: err.sqlMessage });
  }
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ hata: 'Bu kayıt zaten mevcut.' });
  }
  console.error(err);
  return res.status(500).json({ hata: 'Sunucu hatası oluştu.' });
}

module.exports = { hataYakala };