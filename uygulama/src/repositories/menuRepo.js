const { okumaHavuzu } = require('../config/veritabani');
const { redis, menuAnahtari, gunSonunaKalanSaniye } = require('../config/redis');

async function yemekhaneleriGetir() {
  const [satirlar] = await okumaHavuzu.query('SELECT id, ad, konum, kapasite FROM yemekhaneler ORDER BY id');
  return satirlar;
}

async function ogunleriGetir() {
  const [satirlar] = await okumaHavuzu.query('SELECT id, ad, sira, son_saat, servis_baslangic, servis_bitis FROM ogunler ORDER BY sira');
  return satirlar;
}

function tarihAraligiUret(baslangic, bitis) {
  const gunler = [];
  const son = bitis || baslangic;
  const [by, ba, bg] = baslangic.split('-').map(Number);
  const [sy, sa, sg] = son.split('-').map(Number);
  const imlec = new Date(Date.UTC(by, ba - 1, bg));
  const bitisDate = new Date(Date.UTC(sy, sa - 1, sg));

  while (imlec <= bitisDate && gunler.length < 31) {
    gunler.push(imlec.toISOString().slice(0, 10));
    imlec.setUTCDate(imlec.getUTCDate() + 1);
  }
  return gunler;
}

async function veritabanindanMenuDetaylari({ yemekhaneId, baslangic, bitis, ogunId }) {
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
    `SELECT d.menu_id,
            DATE_FORMAT(d.tarih, '%Y-%m-%d') AS tarih,
            d.yemekhane_id, d.yemekhane,
            d.ogun_id, d.ogun, d.ogun_sira,
            d.rezervasyon_son, d.ogrenci_fiyati, d.personel_fiyati,
            d.yemek_id, d.yemek, d.kategori_id, d.kategori, d.kategori_sira,
            d.kalori, d.vejetaryen, d.alerjenler, d.alerjen_idler
     FROM v_menu_detay d
     ${where}
     ORDER BY d.tarih, d.yemekhane_id, d.ogun_sira, d.kategori_sira, d.yemek`,
    parametreler
  );

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
        ogun_sira: s.ogun_sira,
        rezervasyon_son: s.rezervasyon_son,
        ogrenci_fiyati: s.ogrenci_fiyati,
        personel_fiyati: s.personel_fiyati,
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

async function menuleriGetir({ yemekhaneId, baslangic, bitis, ogunId, kullaniciId, kullaniciRol }) {
  const yemekhaneIdler = yemekhaneId
    ? [yemekhaneId]
    : (await yemekhaneleriGetir()).map((y) => y.id);
  const ogunIdler = ogunId
    ? [ogunId]
    : (await ogunleriGetir()).map((o) => o.id);
  const tarihler = tarihAraligiUret(baslangic, bitis);

  const anahtarListesi = [];
  for (const tarih of tarihler) {
    for (const yhId of yemekhaneIdler) {
      for (const ogId of ogunIdler) {
        anahtarListesi.push(menuAnahtari(yhId, tarih, ogId));
      }
    }
  }

  const onbellekDegerleri = anahtarListesi.length ? await redis.mget(anahtarListesi) : [];
  const temelMenuler = [];
  const eksikAnahtarSeti = new Set();

  for (let i = 0; i < anahtarListesi.length; i++) {
    const anahtar = anahtarListesi[i];
    const ham = onbellekDegerleri[i];
    if (ham) {
      console.log(`[CACHE HIT] ${anahtar} -> Redis'ten okundu`);
      temelMenuler.push(JSON.parse(ham));
    } else {
      eksikAnahtarSeti.add(anahtar);
    }
  }

  if (eksikAnahtarSeti.size > 0) {
    const dbMenuleri = await veritabanindanMenuDetaylari({ yemekhaneId, baslangic, bitis, ogunId });
    for (const m of dbMenuleri) {
      const anahtar = menuAnahtari(m.yemekhane_id, m.tarih, m.ogun_id);
      if (eksikAnahtarSeti.has(anahtar)) {
        const ttl = gunSonunaKalanSaniye(m.tarih);
        await redis.set(anahtar, JSON.stringify(m), 'EX', ttl);
        console.log(`[CACHE MISS] ${anahtar} -> veritabanından okundu, Redis'e yazıldı (TTL: ${ttl} sn)`);
        temelMenuler.push(m);
      }
    }
  }

  if (!temelMenuler.length) return [];

  temelMenuler.sort((a, b) => {
    if (a.tarih !== b.tarih) return a.tarih.localeCompare(b.tarih);
    if (a.yemekhane_id !== b.yemekhane_id) return a.yemekhane_id - b.yemekhane_id;
    return (a.ogun_sira || a.ogun_id) - (b.ogun_sira || b.ogun_id);
  });

  const menuIdler = temelMenuler.map((m) => m.menu_id);
  const rezJoin = kullaniciId
    ? 'LEFT JOIN rezervasyonlar r ON r.menu_id = dol.menu_id AND r.kullanici_id = ?'
    : '';
  const rezSecim = kullaniciId
    ? ', r.id AS kullanici_rezervasyon_id, r.durum AS kullanici_rezervasyon_durum'
    : ', NULL AS kullanici_rezervasyon_id, NULL AS kullanici_rezervasyon_durum';
  const sorguParam = kullaniciId ? [kullaniciId, menuIdler] : [menuIdler];

  const [canliSatirlar] = await okumaHavuzu.query(
    `SELECT dol.menu_id,
            (NOW() >= dol.rezervasyon_son) AS suresi_doldu,
            dol.kapasite, dol.rezerve, dol.bos_yer, dol.doluluk_yuzde,
            COALESCE(p.oy_sayisi, 0) AS oy_sayisi,
            p.ortalama_puan
            ${rezSecim}
     FROM v_menu_doluluk dol
     LEFT JOIN v_menu_puan p ON p.menu_id = dol.menu_id
     ${rezJoin}
     WHERE dol.menu_id IN (?)`,
    sorguParam
  );

  const canliHarita = new Map(canliSatirlar.map((s) => [s.menu_id, s]));

  return temelMenuler.map((m) => {
    const canli = canliHarita.get(m.menu_id) || {};
    const kullaniciFiyati = kullaniciRol
      ? (kullaniciRol === 'ogrenci' ? m.ogrenci_fiyati : m.personel_fiyati)
      : null;

    return {
      ...m,
      suresi_doldu: Boolean(canli.suresi_doldu),
      kullanici_fiyati: kullaniciFiyati,
      kapasite: canli.kapasite ?? 0,
      rezerve: canli.rezerve ?? 0,
      bos_yer: canli.bos_yer ?? 0,
      doluluk_yuzde: canli.doluluk_yuzde ?? 0,
      oy_sayisi: canli.oy_sayisi ?? 0,
      ortalama_puan: canli.ortalama_puan ?? null,
      kullanici_rezervasyon_id: canli.kullanici_rezervasyon_id ?? null,
      kullanici_rezervasyon_durum: canli.kullanici_rezervasyon_durum ?? null
    };
  });
}

module.exports = { yemekhaneleriGetir, ogunleriGetir, menuleriGetir };