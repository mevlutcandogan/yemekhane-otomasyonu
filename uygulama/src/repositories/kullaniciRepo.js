const { yazmaHavuzu, okumaHavuzu } = require('../config/veritabani');

async function epostaIleBul(eposta) {
  const [satirlar] = await okumaHavuzu.query(
    'SELECT id, ad, soyad, eposta, sifre_hash, rol, ogrenci_no, bakiye, aktif FROM kullanicilar WHERE eposta = ?',
    [eposta]
  );
  return satirlar[0] || null;
}

// Rezervasyon / bakiye yükleme sonrası anlık bakiye (replikasyon gecikmesine takılmamak için primary)
async function idIleGetirPrimary(id) {
  const [satirlar] = await yazmaHavuzu.query(
    'SELECT id, ad, soyad, eposta, rol, ogrenci_no, bakiye FROM kullanicilar WHERE id = ?',
    [id]
  );
  return satirlar[0] || null;
}

async function bakiyeHareketleriGetir(kullaniciId) {
  const [satirlar] = await okumaHavuzu.query(
    'SELECT id, tur, tutar, rezervasyon_id, aciklama, olusturma FROM bakiye_hareketleri WHERE kullanici_id = ? ORDER BY olusturma DESC, id DESC LIMIT 50',
    [kullaniciId]
  );
  return satirlar;
}

async function bakiyeYukle(kullaniciId, tutar) {
  const [sonuc] = await yazmaHavuzu.query('CALL sp_bakiye_yukle(?, ?)', [kullaniciId, tutar]);
  return sonuc[0][0]; // { hareket_id, bakiye }
}

async function tumAlerjenleriGetir() {
  const [satirlar] = await okumaHavuzu.query('SELECT id, ad FROM alerjenler ORDER BY ad');
  return satirlar;
}

async function kullaniciAlerjenleriniGetir(kullaniciId) {
  const [satirlar] = await okumaHavuzu.query(
    'SELECT alerjen_id FROM kullanici_alerjenleri WHERE kullanici_id = ? ORDER BY alerjen_id',
    [kullaniciId]
  );
  return satirlar.map((s) => Number(s.alerjen_id));
}

async function kullaniciAlerjenleriniGuncelle(kullaniciId, alerjenIdler) {
  const benzersizIdler = [...new Set(alerjenIdler.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  const conn = await yazmaHavuzu.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM kullanici_alerjenleri WHERE kullanici_id = ?', [kullaniciId]);
    if (benzersizIdler.length > 0) {
      const degerler = benzersizIdler.map((alerjenId) => [kullaniciId, alerjenId]);
      await conn.query('INSERT INTO kullanici_alerjenleri (kullanici_id, alerjen_id) VALUES ?', [degerler]);
    }
    await conn.commit();
    return benzersizIdler;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  epostaIleBul,
  idIleGetirPrimary,
  bakiyeHareketleriGetir,
  bakiyeYukle,
  tumAlerjenleriGetir,
  kullaniciAlerjenleriniGetir,
  kullaniciAlerjenleriniGuncelle
};