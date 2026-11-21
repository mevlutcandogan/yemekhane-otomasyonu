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

module.exports = {
  epostaIleBul,
  idIleGetirPrimary,
  bakiyeHareketleriGetir,
  bakiyeYukle
};