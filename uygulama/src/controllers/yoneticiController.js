const yoneticiRepo = require('../repositories/yoneticiRepo');
const { menuOnbellekSil } = require('../config/redis');
const { hataYakala } = require('../middleware/hata');

function simdiIstanbul() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date());
}

async function yemekleriListele(req, res) {
  try {
    const yemekler = await yoneticiRepo.yemekleriGetir();
    res.json({ yemekler });
  } catch (err) {
    hataYakala(err, res);
  }
}

async function kullanicilariListele(req, res) {
  try {
    const kullanicilar = await yoneticiRepo.kullanicilariGetir();
    res.json({ kullanicilar });
  } catch (err) {
    hataYakala(err, res);
  }
}

async function menuOlustur(req, res) {
  try {
    const { yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati, yemek_idler } = req.body || {};
    const yemekIdler = Array.isArray(yemek_idler) ? yemek_idler.map(Number).filter(Boolean) : [];
    const ogrFiyat = Number(ogrenci_fiyati);
    const perFiyat = Number(personel_fiyati);

    if (!yemekhane_id || !tarih || !ogun_id || !yemekIdler.length) {
      return res.status(400).json({ hata: 'Yemekhane, tarih, öğün ve en az bir yemek zorunludur.' });
    }
    if (!Number.isFinite(ogrFiyat) || ogrFiyat < 0 || !Number.isFinite(perFiyat) || perFiyat < 0) {
      return res.status(400).json({ hata: 'Fiyatlar 0 veya daha büyük olmalıdır.' });
    }

    const menuId = await yoneticiRepo.menuKaydet({
      yemekhaneId: Number(yemekhane_id),
      tarih,
      ogunId: Number(ogun_id),
      ogrenciFiyati: ogrFiyat,
      personelFiyati: perFiyat,
      yemekIdler
    });

    await menuOnbellekSil(Number(yemekhane_id), tarih, Number(ogun_id));

    res.status(201).json({ mesaj: 'Menü kaydedildi.', menu_id: menuId });
  } catch (err) {
    hataYakala(err, res);
  }
}

async function menuGuncelle(req, res) {
  try {
    const menuId = Number(req.params.id);
    const { ogrenci_fiyati, personel_fiyati, yemek_idler } = req.body || {};
    const yemekIdler = Array.isArray(yemek_idler) ? yemek_idler.map(Number).filter(Boolean) : [];
    const ogrFiyat = Number(ogrenci_fiyati);
    const perFiyat = Number(personel_fiyati);

    if (!menuId || !yemekIdler.length) {
      return res.status(400).json({ hata: 'Menü ve en az bir yemek zorunludur.' });
    }
    if (!Number.isFinite(ogrFiyat) || ogrFiyat < 0 || !Number.isFinite(perFiyat) || perFiyat < 0) {
      return res.status(400).json({ hata: 'Fiyatlar 0 veya daha büyük olmalıdır.' });
    }

    const guncellenen = await yoneticiRepo.menuGuncelle(menuId, {
      ogrenciFiyati: ogrFiyat,
      personelFiyati: perFiyat,
      yemekIdler
    });

    if (!guncellenen) {
      return res.status(404).json({ hata: 'Menü bulunamadı.' });
    }

    await menuOnbellekSil(guncellenen.yemekhane_id, guncellenen.tarih, guncellenen.ogun_id);

    res.json({ mesaj: 'Menü güncellendi.', menu: guncellenen });
  } catch (err) {
    hataYakala(err, res);
  }
}

async function turnike(req, res) {
  try {
    const kullaniciId = Number(req.body?.kullanici_id);
    const yemekhaneId = Number(req.body?.yemekhane_id);
    const zaman = req.body?.zaman || simdiIstanbul();

    if (!kullaniciId || !yemekhaneId) {
      return res.status(400).json({ hata: 'Kullanıcı ve yemekhane seçimi zorunludur.' });
    }

    const sonuc = await yoneticiRepo.turnikeGecis(kullaniciId, yemekhaneId, zaman);
    res.json({ mesaj: 'Turnike geçişi onaylandı.', sonuc });
  } catch (err) {
    hataYakala(err, res);
  }
}

async function rapor(req, res) {
  try {
    const tarih = req.query.tarih || null;
    const veri = await yoneticiRepo.raporGetir(tarih);
    res.json(veri);
  } catch (err) {
    hataYakala(err, res);
  }
}

module.exports = {
  yemekleriListele,
  kullanicilariListele,
  menuOlustur,
  menuGuncelle,
  turnike,
  rapor
};