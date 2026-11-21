const crypto = require('crypto');

// Aşama 2'de bellek içi tutulur; Aşama 3'te Redis'e taşınacak
const oturumlar = new Map();
const SURE_MS = 30 * 60 * 1000; // 30 dakika

async function olustur(kullanici) {
  const token = crypto.randomBytes(24).toString('hex');
  oturumlar.set(token, {
    veri: kullanici,
    bitis: Date.now() + SURE_MS
  });
  return token;
}

async function getir(token) {
  if (!token) return null;
  const kayit = oturumlar.get(token);
  if (!kayit) return null;
  if (Date.now() > kayit.bitis) {
    oturumlar.delete(token);
    return null;
  }
  // Kayan süre: her istekte 30 dk uzat
  kayit.bitis = Date.now() + SURE_MS;
  return kayit.veri;
}

async function sil(token) {
  if (token) oturumlar.delete(token);
}

module.exports = { olustur, getir, sil };