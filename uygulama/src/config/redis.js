const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT || 6379)
});

redis.on('connect', () => {
  console.log('[REDIS] Bağlantı kuruldu.');
});

redis.on('error', (err) => {
  console.error('[REDIS] Hata:', err.message);
});

function menuAnahtari(yemekhaneId, tarih, ogunId) {
  return `menu:${yemekhaneId}:${tarih}:${ogunId}`;
}

function gunSonunaKalanSaniye(tarihStr) {
  const simdi = Date.now();
  const hedefMs = new Date(`${tarihStr}T23:59:59+03:00`).getTime();
  let kalan = Math.floor((hedefMs - simdi) / 1000);

  // Geçmiş bir tarih sorgulanırsa bugünün sonuna kadar önbellekte tut
  if (!Number.isFinite(kalan) || kalan <= 0) {
    const bugun = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    const bugunSonu = new Date(`${bugun}T23:59:59+03:00`).getTime();
    kalan = Math.max(60, Math.floor((bugunSonu - simdi) / 1000));
  }
  return kalan;
}

async function menuOnbellekSil(yemekhaneId, tarih, ogunId) {
  const anahtar = menuAnahtari(yemekhaneId, tarih, ogunId);
  const silinen = await redis.del(anahtar);
  console.log(`[CACHE DEL] ${anahtar} (silinen: ${silinen})`);
}

module.exports = {
  redis,
  menuAnahtari,
  gunSonunaKalanSaniye,
  menuOnbellekSil
};