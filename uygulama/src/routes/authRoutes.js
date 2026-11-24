const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { girisGerekli } = require('../middleware/yetki');

router.post('/giris', authController.girisYap);
router.post('/cikis', girisGerekli, authController.cikisYap);
router.get('/ben', girisGerekli, authController.ben);
router.get('/bakiye', girisGerekli, authController.bakiyeGetir);
router.post('/bakiye/yukle', girisGerekli, authController.bakiyeYukle);
router.get('/profil/alerjenler', girisGerekli, authController.profilAlerjenGetir);
router.put('/profil/alerjenler', girisGerekli, authController.profilAlerjenGuncelle);

module.exports = router;