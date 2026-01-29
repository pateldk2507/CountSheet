const express = require('express');
const router = express.Router();
const MonthController = require('../controller/MonthController.js');

console.log('Month Router');

router.get('/',MonthController.index);
router.get('/call',MonthController.getData);

module.exports = router;