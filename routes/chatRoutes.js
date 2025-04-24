const express = require('express');
const { getUsers, getUnreadMessages } = require('../controllers/chatcontroller');
const router = express.Router();
const auth = require("../middlewares/IsAuth")

router.get('/getUsers', getUsers);
router.get('/getUnread', getUnreadMessages);

module.exports = router;
