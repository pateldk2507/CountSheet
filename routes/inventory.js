const express = require("express");
const router = express.Router();

const inventoryController = require("../controller/inventoryController.js");
console.log("inventory");

router.get("/", inventoryController.index);
router.get('/data',inventoryController.getItem);
module.exports = router;
