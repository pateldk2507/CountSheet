const express = require('express');
const router = express.Router();
const PackingSlipController = require('../controller/PackingSlipController');

console.log('PS Router');

router.get('/',PackingSlipController.index);
router.get('/data',PackingSlipController.getData);


module.exports = router;