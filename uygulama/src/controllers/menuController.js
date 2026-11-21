const menuRepo = require('../repositories/menuRepo');
const { hataYakala } = require('../middleware/hata');

function bugunTarih() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
}

async function metaGetir(req, res) {
  try {
    const [yemekhaneler, ogunler] = await Promise.all([
      menuRepo.yemekhaneleriGetir(),
      menuRepo.ogunleriGetir()
    ]);
    res.json({ yemekhaneler, ogunler });
  } catch (err) {
    hataYakala(err, res);
  }
}

async function gununMenusu(req, res) {
  try {
    const tarih = req.query.tarih || bugunTarih();
    const yemekhaneId = req.query.yemekhane_id ? Number(req.query.yemekhane_id) : null;
    const ogunId = req.query.ogun_id ? Number(req.query.ogun_id) : null;

    const menuler = await menuRepo.menuleriGetir({
      yemekhaneId,
      baslangic: tarih,
      ogunId
    });
    res.json({ tarih, menuler });
  } catch (err) {
    hataYakala(err, res);
  }
}

async function haftalikMenu(req, res) {
  try {
    const baslangic = req.query.baslangic || bugunTarih();
    const bitisTarih = new Date(`${baslangic}T00:00:00`);
    bitisTarih.setDate(bitisTarih.getDate() + 6);
    const bitis = req.query.bitis || bitisTarih.toISOString().slice(0, 10);
    const yemekhaneId = req.query.yemekhane_id ? Number(req.query.yemekhane_id) : null;

    const menuler = await menuRepo.menuleriGetir({ yemekhaneId, baslangic, bitis });
    res.json({ baslangic, bitis, menuler });
  } catch (err) {
    hataYakala(err, res);
  }
}

module.exports = { metaGetir, gununMenusu, haftalikMenu };