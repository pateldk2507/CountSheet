const express = require('express');
const router = express.Router();
const WeekController = require('../controller/WeekController.js');

console.log('Week Router');

router.get('/',WeekController.index);

module.exports = router;


