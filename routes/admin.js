const express = require("express");
const router = express.Router();

const adminController = require("../controller/adminController.js");
console.log("Admin");

router.get("/", adminController.index);
router.post("/save-agents",adminController.saveAgents);
module.exports = router;
