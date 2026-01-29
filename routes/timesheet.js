const express = require("express");
const router = express.Router();

const timesheetController = require("../controller/timesheetController.js");
console.log("timesheet");

router.get("/", timesheetController.index);
router.get('/data',timesheetController.getItem);
module.exports = router;
