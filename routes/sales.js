const express = require('express');
const router = express.Router();
const SalesController = require('../controller/SalesController.js');

console.log('Sales Router');

router.get('/',SalesController.index);
router.get('/data',SalesController.data);

module.exports = router;