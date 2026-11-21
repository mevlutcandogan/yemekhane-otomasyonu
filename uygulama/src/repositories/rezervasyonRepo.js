const { yazmaHavuzu, okumaHavuzu } = require('../config/veritabani');

async function rezervasyonYap(kullaniciId, menuId) {
  const [sonuc] = await yazmaHavuzu.query('CALL sp_rezervasyon_yap(?, ?)', [kullaniciId, menuId]);
  return sonuc[0][0];
}

async function rezervasyonIptal(kullaniciId, rezervasyonId) {
  const [sonuc] = await yazmaHavuzu.query('CALL sp_rezervasyon_iptal(?, ?)', [kullaniciId, rezervasyonId]);
  return sonuc[0][0];
}

async function kullaniciRezervasyonlari(kullaniciId) {
  const [satirlar] = await okumaHavuzu.query(
    `SELECT r.id, r.menu_id, r.durum, r.ucret, r.olusturma, r.kullanma_zamani, r.iptal_zamani,
            m.tarih, y.ad AS yemekhane, o.ad AS ogun,
            deg.puan AS verdigim_puan, deg.yorum AS verdigim_yorum
     FROM rezervasyonlar r
     JOIN menuler m ON m.id = r.menu_id
     JOIN yemekhaneler y ON y.id = m.yemekhane_id
     JOIN ogunler o ON o.id = m.ogun_id
     LEFT JOIN degerlendirmeler deg ON deg.kullanici_id = r.kullanici_id AND deg.menu_id = r.menu_id
     WHERE r.kullanici_id = ?
     ORDER BY m.tarih DESC, r.id DESC`,
    [kullaniciId]
  );
  return satirlar;
}

async function degerlendirmeKaydet(kullaniciId, menuId, puan, yorum) {
  // Sadece 'kullanildi' durumundaki rezervasyonlar değerlendirilebilir
  const [kontrol] = await okumaHavuzu.query(
    "SELECT id FROM rezervasyonlar WHERE kullanici_id = ? AND menu_id = ? AND durum = 'kullanildi' LIMIT 1",
    [kullaniciId, menuId]
  );
  if (kontrol.length === 0) {
    const hata = new Error('Yalnızca kullandığınız öğünleri değerlendirebilirsiniz.');
    hata.sqlState = '45000';
    hata.sqlMessage = hata.message;
    throw hata;
  }

  await yazmaHavuzu.query(
    `INSERT INTO degerlendirmeler (kullanici_id, menu_id, puan, yorum)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE puan = VALUES(puan), yorum = VALUES(yorum)`,
    [kullaniciId, menuId, puan, yorum || null]
  );
}

module.exports = {
  rezervasyonYap,
  rezervasyonIptal,
  kullaniciRezervasyonlari,
  degerlendirmeKaydet
};