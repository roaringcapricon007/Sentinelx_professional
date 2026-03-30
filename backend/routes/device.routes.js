const express = require("express");
const router = express.Router();

const deviceController = require("../controllers/device.controller");

// Register device (Point 4)
router.post("/register", deviceController.registerDevice);

module.exports = router;
