var express = require("express");
const router = express.Router();

const medicoController = require("../controllers/medicoController");
const auth = require("../middlewares/IsAuth");


router.get("/get_inquerito",auth, medicoController.index);

module.exports = router;