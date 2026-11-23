const crypto = require('crypto');
const { redis } = require('./redis');

const OTURUM_TTL_SN = 30 * 60; // 30 dakika

function oturumAnahtari(token) {
  return `oturum:${token}`;
}

async function olustur(kullanici) {
  const token = crypto.randomBytes(24).toString('hex');
  const anahtar = oturumAnahtari(token);
  await redis.set(anahtar, JSON.stringify(kullanici), 'EX', OTURUM_TTL_SN);
  console.log(`[OTURUM] Oluşturuldu: ${anahtar} (TTL: ${OTURUM_TTL_SN} sn)`);
  return token;
}

async function getir(token) {
  if (!token) return null;
  const anahtar = oturumAnahtari(token);
  const kayit = await redis.get(anahtar);
  if (!kayit) return null;

  // Kayan süre: her istekte 30 dakika yenile
  await redis.expire(anahtar, OTURUM_TTL_SN);
  return JSON.parse(kayit);
}

async function sil(token) {
  if (!token) return;
  const anahtar = oturumAnahtari(token);
  await redis.del(anahtar);
  console.log(`[OTURUM] Silindi: ${anahtar}`);
}

module.exports = { olustur, getir, sil };