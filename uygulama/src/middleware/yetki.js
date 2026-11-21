const oturumDeposu = require('../config/oturumDeposu');

async function girisGerekli(req, res, next) {
  const token = req.cookies.oturum_token;
  const kullanici = await oturumDeposu.getir(token);
  if (!kullanici) {
    return res.status(401).json({ hata: 'Oturum açmanız gerekiyor.' });
  }
  req.kullanici = kullanici;
  req.oturumToken = token;
  next();
}

function yoneticiGerekli(req, res, next) {
  if (!req.kullanici || req.kullanici.rol !== 'yonetici') {
    return res.status(403).json({ hata: 'Bu işlem için yönetici yetkisi gerekir.' });
  }
  next();
}

module.exports = { girisGerekli, yoneticiGerekli };