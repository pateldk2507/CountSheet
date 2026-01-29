const express = require("express");
const router = express.Router();

const updateinventoryController = require("../controller/updateInventory.js");
console.log("Update inventory");

router.get("/", updateinventoryController.index);
router.get('/json',updateinventoryController.json);
router.post('/apply',updateinventoryController.apply);
module.exports = router;
