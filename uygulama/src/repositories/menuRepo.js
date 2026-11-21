const { okumaHavuzu } = require('../config/veritabani');

async function yemekhaneleriGetir() {
  const [satirlar] = await okumaHavuzu.query('SELECT id, ad, konum, kapasite FROM yemekhaneler ORDER BY id');
  return satirlar;
}

async function ogunleriGetir() {
  const [satirlar] = await okumaHavuzu.query('SELECT id, ad, sira, son_saat, servis_baslangic, servis_bitis FROM ogunler ORDER BY sira');
  return satirlar;
}

async function menuleriGetir({ yemekhaneId, baslangic, bitis, ogunId, kullaniciId, kullaniciRol }) {
  const kosullar = [];
  const parametreler = [];

  let rezJoin = '';
  let rezSecim = ', NULL AS kullanici_rezervasyon_id, NULL AS kullanici_rezervasyon_durum';
  if (kullaniciId) {
    rezJoin = 'LEFT JOIN rezervasyonlar r ON r.menu_id = d.menu_id AND r.kullanici_id = ?';
    rezSecim = ', r.id AS kullanici_rezervasyon_id, r.durum AS kullanici_rezervasyon_durum';
    parametreler.push(kullaniciId);
  }

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
            (NOW() >= d.rezervasyon_son) AS suresi_doldu,
            dol.kapasite, dol.rezerve, dol.bos_yer, dol.doluluk_yuzde,
            COALESCE(p.oy_sayisi, 0) AS oy_sayisi,
            p.ortalama_puan
            ${rezSecim}
     FROM v_menu_detay d
     LEFT JOIN v_menu_doluluk dol ON dol.menu_id = d.menu_id
     LEFT JOIN v_menu_puan p ON p.menu_id = d.menu_id
     ${rezJoin}
     ${where}
     ORDER BY d.tarih, d.yemekhane_id, d.ogun_sira, d.kategori_sira, d.yemek`,
    parametreler
  );

  const harita = new Map();
  for (const s of satirlar) {
    if (!harita.has(s.menu_id)) {
      const kullaniciFiyati = kullaniciRol
        ? (kullaniciRol === 'ogrenci' ? s.ogrenci_fiyati : s.personel_fiyati)
        : null;

      harita.set(s.menu_id, {
        menu_id: s.menu_id,
        tarih: s.tarih,
        yemekhane_id: s.yemekhane_id,
        yemekhane: s.yemekhane,
        ogun_id: s.ogun_id,
        ogun: s.ogun,
        rezervasyon_son: s.rezervasyon_son,
        suresi_doldu: Boolean(s.suresi_doldu),
        ogrenci_fiyati: s.ogrenci_fiyati,
        personel_fiyati: s.personel_fiyati,
        kullanici_fiyati: kullaniciFiyati,
        kapasite: s.kapasite,
        rezerve: s.rezerve,
        bos_yer: s.bos_yer,
        doluluk_yuzde: s.doluluk_yuzde,
        oy_sayisi: s.oy_sayisi,
        ortalama_puan: s.ortalama_puan,
        kullanici_rezervasyon_id: s.kullanici_rezervasyon_id,
        kullanici_rezervasyon_durum: s.kullanici_rezervasyon_durum,
        toplam_kalori: 0,
        yemekler: []
      });
    }

    const menu = harita.get(s.menu_id);
    const alerjenIdler = s.alerjen_idler
      ? String(s.alerjen_idler).split(',').map(Number).filter(Boolean)
      : [];

    menu.toplam_kalori += Number(s.kalori || 0);
    menu.yemekler.push({
      yemek_id: s.yemek_id,
      ad: s.yemek,
      kategori: s.kategori,
      kalori: s.kalori,
      vejetaryen: Boolean(s.vejetaryen),
      alerjenler: s.alerjenler || '',
      alerjen_idler: alerjenIdler
    });
  }

  return Array.from(harita.values());
}

module.exports = { yemekhaneleriGetir, ogunleriGetir, menuleriGetir };