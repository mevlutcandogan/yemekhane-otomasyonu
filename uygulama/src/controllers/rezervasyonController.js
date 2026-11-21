const rezervasyonRepo = require('../repositories/rezervasyonRepo');
const kullaniciRepo = require('../repositories/kullaniciRepo');
const { hataYakala } = require('../middleware/hata');

async function listele(req, res) {
  try {
    const rezervasyonlar = await rezervasyonRepo.kullaniciRezervasyonlari(req.kullanici.id);
    res.json({ rezervasyonlar });
  } catch (err) {
    hataYakala(err, res);
  }
}

async function olustur(req, res) {
  try {
    const menuId = Number(req.body?.menu_id);
    if (!menuId) {
      return res.status(400).json({ hata: 'Geçerli bir menü seçiniz.' });
    }
    const sonuc = await rezervasyonRepo.rezervasyonYap(req.kullanici.id, menuId);
    // Rezervasyon sonrası güncel bakiyeyi doğrudan kaynaktan (primary) oku
    const guncelKullanici = await kullaniciRepo.idIleGetirPrimary(req.kullanici.id);

    res.status(201).json({
      mesaj: 'Rezervasyon oluşturuldu.',
      rezervasyon: sonuc,
      bakiye: guncelKullanici.bakiye
    });
  } catch (err) {
    hataYakala(err, res);
  }
}

async function iptalEt(req, res) {
  try {
    const rezervasyonId = Number(req.params.id);
    const sonuc = await rezervasyonRepo.rezervasyonIptal(req.kullanici.id, rezervasyonId);
    const guncelKullanici = await kullaniciRepo.idIleGetirPrimary(req.kullanici.id);

    res.json({
      mesaj: 'Rezervasyon iptal edildi.',
      sonuc,
      bakiye: guncelKullanici.bakiye
    });
  } catch (err) {
    hataYakala(err, res);
  }
}

async function degerlendir(req, res) {
  try {
    const menuId = Number(req.body?.menu_id);
    const puan = Number(req.body?.puan);
    const yorum = (req.body?.yorum || '').trim();

    if (!menuId || !Number.isInteger(puan) || puan < 1 || puan > 5) {
      return res.status(400).json({ hata: 'Menü ve 1-5 arası puan zorunludur.' });
    }

    await rezervasyonRepo.degerlendirmeKaydet(req.kullanici.id, menuId, puan, yorum);
    res.json({ mesaj: 'Değerlendirmeniz kaydedildi.' });
  } catch (err) {
    hataYakala(err, res);
  }
}

module.exports = { listele, olustur, iptalEt, degerlendir };