const bcrypt = require('bcryptjs');
const kullaniciRepo = require('../repositories/kullaniciRepo');
const oturumDeposu = require('../config/oturumDeposu');
const { hataYakala } = require('../middleware/hata');

async function girisYap(req, res) {
  try {
    const { eposta, sifre } = req.body || {};
    if (!eposta || !sifre) {
      return res.status(400).json({ hata: 'E-posta ve şifre zorunludur.' });
    }

    const kullanici = await kullaniciRepo.epostaIleBul(eposta.trim());
    if (!kullanici || !kullanici.aktif) {
      return res.status(401).json({ hata: 'E-posta veya şifre hatalı.' });
    }

    const eslesti = await bcrypt.compare(sifre, kullanici.sifre_hash);
    if (!eslesti) {
      return res.status(401).json({ hata: 'E-posta veya şifre hatalı.' });
    }

    const oturumBilgisi = {
      id: kullanici.id,
      ad: kullanici.ad,
      soyad: kullanici.soyad,
      eposta: kullanici.eposta,
      rol: kullanici.rol,
      ogrenci_no: kullanici.ogrenci_no
    };

    const token = await oturumDeposu.olustur(oturumBilgisi);
    res.cookie('oturum_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    });

    res.json({
      mesaj: 'Giriş başarılı.',
      kullanici: { ...oturumBilgisi, bakiye: kullanici.bakiye }
    });
  } catch (err) {
    hataYakala(err, res);
  }
}

async function cikisYap(req, res) {
  await oturumDeposu.sil(req.oturumToken);
  res.clearCookie('oturum_token', { path: '/' });
  res.json({ mesaj: 'Çıkış yapıldı.' });
}

async function ben(req, res) {
  try {
    const guncel = await kullaniciRepo.idIleGetirPrimary(req.kullanici.id);
    res.json({ kullanici: guncel });
  } catch (err) {
    hataYakala(err, res);
  }
}

async function bakiyeGetir(req, res) {
  try {
    const kullanici = await kullaniciRepo.idIleGetirPrimary(req.kullanici.id);
    const hareketler = await kullaniciRepo.bakiyeHareketleriGetir(req.kullanici.id);
    res.json({ bakiye: kullanici.bakiye, hareketler });
  } catch (err) {
    hataYakala(err, res);
  }
}

async function bakiyeYukle(req, res) {
  try {
    const tutar = Number(req.body?.tutar);
    if (!Number.isFinite(tutar) || tutar <= 0) {
      return res.status(400).json({ hata: 'Geçerli bir tutar giriniz.' });
    }
    const sonuc = await kullaniciRepo.bakiyeYukle(req.kullanici.id, tutar);
    res.json({ mesaj: 'Bakiye yüklendi.', ...sonuc });
  } catch (err) {
    hataYakala(err, res);
  }
}

module.exports = { girisYap, cikisYap, ben, bakiyeGetir, bakiyeYukle };