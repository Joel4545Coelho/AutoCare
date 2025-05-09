const express = require("express");
const router = express.Router();
const User = require("../models/user");
const auth = require("../middlewares/IsAuth");
const inqueritoscontroller = require("../controllers/inqueritoscontroller");
 
 
router.get("/doencas",auth, inqueritoscontroller.getDoencas)
 
module.exports = router;