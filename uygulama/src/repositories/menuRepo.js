const { okumaHavuzu } = require('../config/veritabani');

async function yemekhaneleriGetir() {
  const [satirlar] = await okumaHavuzu.query('SELECT id, ad, konum, kapasite FROM yemekhaneler ORDER BY id');
  return satirlar;
}

async function ogunleriGetir() {
  const [satirlar] = await okumaHavuzu.query('SELECT id, ad, sira, son_saat, servis_baslangic, servis_bitis FROM ogunler ORDER BY sira');
  return satirlar;
}

// Tarih aralığı veya tek gün için menüleri yemekleriyle birlikte gruplayarak getirir
async function menuleriGetir({ yemekhaneId, baslangic, bitis, ogunId }) {
  const kosullar = [];
  const parametreler = [];

  if (yemekhaneId) {
    kosullar.push('d.yemekhane_id = ?');
    parametreler.push(yemekhaneId);
  }
  if (baslangic && bitis) {
    kosullar.push('d.tarih BETWEEN ? AND ?');
    parametreler.push(baslangic, bitis);
  } else if (baslangic) {
    kosullar.push('d.tarih = ?');
    parametreler.push(baslangic);
  }
  if (ogunId) {
    kosullar.push('d.ogun_id = ?');
    parametreler.push(ogunId);
  }

  const where = kosullar.length ? `WHERE ${kosullar.join(' AND ')}` : '';

  const [satirlar] = await okumaHavuzu.query(
    `SELECT d.*,
            dol.kapasite, dol.rezerve, dol.bos_yer, dol.doluluk_yuzde,
            COALESCE(p.oy_sayisi, 0) AS oy_sayisi,
            p.ortalama_puan
     FROM v_menu_detay d
     LEFT JOIN v_menu_doluluk dol ON dol.menu_id = d.menu_id
     LEFT JOIN v_menu_puan p ON p.menu_id = d.menu_id
     ${where}
     ORDER BY d.tarih, d.yemekhane_id, d.ogun_sira, d.kategori_sira`,
    parametreler
  );

  // Satırları menu_id bazında grupla
  const harita = new Map();
  for (const s of satirlar) {
    if (!harita.has(s.menu_id)) {
      harita.set(s.menu_id, {
        menu_id: s.menu_id,
        tarih: s.tarih,
        yemekhane_id: s.yemekhane_id,
        yemekhane: s.yemekhane,
        ogun_id: s.ogun_id,
        ogun: s.ogun,
        rezervasyon_son: s.rezervasyon_son,
        ogrenci_fiyati: s.ogrenci_fiyati,
        personel_fiyati: s.personel_fiyati,
        kapasite: s.kapasite,
        rezerve: s.rezerve,
        bos_yer: s.bos_yer,
        doluluk_yuzde: s.doluluk_yuzde,
        oy_sayisi: s.oy_sayisi,
        ortalama_puan: s.ortalama_puan,
        yemekler: []
      });
    }
    harita.get(s.menu_id).yemekler.push({
      yemek_id: s.yemek_id,
      ad: s.yemek,
      kategori: s.kategori,
      kalori: s.kalori,
      vejetaryen: Boolean(s.vejetaryen),
      alerjenler: s.alerjenler || ''
    });
  }

  return Array.from(harita.values());
}

module.exports = { yemekhaneleriGetir, ogunleriGetir, menuleriGetir };