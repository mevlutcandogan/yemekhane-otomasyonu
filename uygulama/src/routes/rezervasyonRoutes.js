const express = require('express');
const router = express.Router();
const rezervasyonController = require('../controllers/rezervasyonController');
const { girisGerekli } = require('../middleware/yetki');

router.get('/', girisGerekli, rezervasyonController.listele);
router.post('/', girisGerekli, rezervasyonController.olustur);
router.post('/:id/iptal', girisGerekli, rezervasyonController.iptalEt);
router.post('/degerlendir', girisGerekli, rezervasyonController.degerlendir);

module.exports = router;