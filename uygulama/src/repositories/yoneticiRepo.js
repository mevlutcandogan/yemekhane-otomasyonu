const { yazmaHavuzu, okumaHavuzu } = require('../config/veritabani');

async function yemekleriGetir() {
  const [satirlar] = await okumaHavuzu.query(
    `SELECT y.id, y.ad, y.kalori, y.vejetaryen, y.kategori_id, k.ad AS kategori
     FROM yemekler y
     JOIN yemek_kategorileri k ON k.id = y.kategori_id
     ORDER BY k.sira, y.ad`
  );
  return satirlar;
}

async function kullanicilariGetir() {
  const [satirlar] = await okumaHavuzu.query(
    'SELECT id, ad, soyad, eposta, rol, ogrenci_no, bakiye, aktif FROM kullanicilar ORDER BY rol, id'
  );
  return satirlar;
}

async function menuKaydet({ yemekhaneId, tarih, ogunId, ogrenciFiyati, personelFiyati, yemekIdler }) {
  const conn = await yazmaHavuzu.getConnection();
  try {
    await conn.beginTransaction();

    const [sonuc] = await conn.query(
      `INSERT INTO menuler (yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         id = LAST_INSERT_ID(id),
         ogrenci_fiyati = VALUES(ogrenci_fiyati),
         personel_fiyati = VALUES(personel_fiyati)`,
      [yemekhaneId, tarih, ogunId, ogrenciFiyati, personelFiyati]
    );

    const menuId = sonuc.insertId;
    await conn.query('DELETE FROM menu_yemekleri WHERE menu_id = ?', [menuId]);

    if (yemekIdler.length > 0) {
      const degerler = yemekIdler.map((yemekId) => [menuId, yemekId]);
      await conn.query('INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?', [degerler]);
    }

    await conn.commit();
    return menuId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function menuGuncelle(menuId, { ogrenciFiyati, personelFiyati, yemekIdler }) {
  const conn = await yazmaHavuzu.getConnection();
  try {
    await conn.beginTransaction();

    const [mevcut] = await conn.query(
      "SELECT id, yemekhane_id, DATE_FORMAT(tarih, '%Y-%m-%d') AS tarih, ogun_id FROM menuler WHERE id = ?",
      [menuId]
    );
    if (mevcut.length === 0) {
      await conn.rollback();
      return null;
    }

    await conn.query(
      'UPDATE menuler SET ogrenci_fiyati = ?, personel_fiyati = ? WHERE id = ?',
      [ogrenciFiyati, personelFiyati, menuId]
    );

    await conn.query('DELETE FROM menu_yemekleri WHERE menu_id = ?', [menuId]);
    if (yemekIdler.length > 0) {
      const degerler = yemekIdler.map((yemekId) => [menuId, yemekId]);
      await conn.query('INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?', [degerler]);
    }

    await conn.commit();
    return mevcut[0];
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function turnikeGecis(kullaniciId, yemekhaneId, zaman) {
  const [sonuc] = await yazmaHavuzu.query(
    'CALL sp_turnike_gecis(?, ?, ?)',
    [kullaniciId, yemekhaneId, zaman]
  );
  return sonuc[0] ? sonuc[0][0] : { durum: 'ok' };
}

async function raporGetir(tarih) {
  const where = tarih ? 'WHERE d.tarih = ?' : '';
  const parametreler = tarih ? [tarih] : [];

  const [doluluk] = await okumaHavuzu.query(
    `SELECT d.*, m.ogrenci_fiyati, m.personel_fiyati,
            COALESCE(p.oy_sayisi, 0) AS oy_sayisi, p.ortalama_puan,
            (SELECT GROUP_CONCAT(my.yemek_id ORDER BY my.yemek_id)
               FROM menu_yemekleri my WHERE my.menu_id = d.menu_id) AS yemek_idler
     FROM v_menu_doluluk d
     JOIN menuler m ON m.id = d.menu_id
     LEFT JOIN v_menu_puan p ON p.menu_id = d.menu_id
     ${where}
     ORDER BY d.tarih DESC, d.yemekhane_id, d.ogun_id
     LIMIT 60`,
    parametreler
  );

  const [yorumlar] = await okumaHavuzu.query(
    `SELECT deg.id, deg.puan, deg.yorum, deg.olusturma,
            k.ad, k.soyad, m.tarih, y.ad AS yemekhane, o.ad AS ogun
     FROM degerlendirmeler deg
     JOIN kullanicilar k ON k.id = deg.kullanici_id
     JOIN menuler m ON m.id = deg.menu_id
     JOIN yemekhaneler y ON y.id = m.yemekhane_id
     JOIN ogunler o ON o.id = m.ogun_id
     ORDER BY deg.olusturma DESC
     LIMIT 20`
  );

  return {
    tarih: tarih || null,
    doluluk: doluluk.map((s) => ({
      ...s,
      yemek_idler: s.yemek_idler ? String(s.yemek_idler).split(',').map(Number) : []
    })),
    yorumlar
  };
}

module.exports = {
  yemekleriGetir,
  kullanicilariGetir,
  menuKaydet,
  menuGuncelle,
  turnikeGecis,
  raporGetir
};