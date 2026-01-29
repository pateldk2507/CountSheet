const express = require('express');
const router = express.Router();
const ITController = require('../controller/ITController.js');

console.log('In Router');

router.get('/',ITController.index);
router.get('/api',ITController.test);

router.use('/month', require('./month'));
router.use('/week', require('./week'));
router.use('/invoice',require('./invoice'));
router.use('/sales',require('./sales'));
router.use('/packingslip',require('./packingslip'));
router.use('/inventory',require('./inventory'));
router.use('/admin',require('./admin'));
router.use('/update',require('./update'));
router.use('/timesheet',require('./timesheet'));



router.get('*', function(req,res){
  res.render('404',{error: 'Page Not Found'});
})

module.exports = router;