const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

router.get('/meta', menuController.metaGetir);
router.get('/gunun', menuController.gununMenusu);
router.get('/haftalik', menuController.haftalikMenu);

module.exports = router;