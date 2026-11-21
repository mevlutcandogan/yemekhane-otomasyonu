const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { oturumVarsaOku } = require('../middleware/yetki');

router.get('/meta', menuController.metaGetir);
router.get('/gunun', oturumVarsaOku, menuController.gununMenusu);
router.get('/haftalik', oturumVarsaOku, menuController.haftalikMenu);

module.exports = router;