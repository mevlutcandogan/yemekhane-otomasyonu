const express = require('express');
const router = express.Router();
const yoneticiController = require('../controllers/yoneticiController');
const { girisGerekli, yoneticiGerekli } = require('../middleware/yetki');

router.use(girisGerekli, yoneticiGerekli);

router.get('/yemekler', yoneticiController.yemekleriListele);
router.get('/kullanicilar', yoneticiController.kullanicilariListele);
router.post('/menuler', yoneticiController.menuOlustur);
router.put('/menuler/:id', yoneticiController.menuGuncelle);
router.post('/turnike', yoneticiController.turnike);
router.get('/rapor', yoneticiController.rapor);

module.exports = router;