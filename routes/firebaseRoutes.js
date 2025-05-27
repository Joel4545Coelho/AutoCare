const express = require('express');
const router = express.Router();
const firebaseController = require('../controllers/firebaseController');
const auth = require("../middlewares/IsAuth")

router.post('/firebaseToken/belongs/:userId',auth, firebaseController.addFirebaseToken);

module.exports = router;