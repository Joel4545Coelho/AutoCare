const express = require('express');
const { getUsers, getUnreadMessages } = require('../controllers/chatcontroller');
const router = express.Router();
const auth = require("../middlewares/IsAuth")
const upload = require('../middlewares/multer'); 

router.get('/getUsers', auth, getUsers);
router.get('/getUnread', auth, getUnreadMessages);

module.exports = router;
