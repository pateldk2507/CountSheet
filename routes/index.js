const express = require('express');
const router = express.Router();

const inventoryController = require('../controller/inventoryController.js');

router.get('/',inventoryController.index);

module.exports = router;