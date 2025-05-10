const express = require('express');
const { getUsers, getUnreadMessages } = require('../controllers/chatcontroller');
const router = express.Router();
const auth = require("../middlewares/IsAuth")
const upload = require('../middlewares/multer'); 

router.get('/getUsers', auth, getUsers);
router.get('/getUnread', auth, getUnreadMessages);

router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file || !req.file.location) {
      return res.status(400).json({ error: 'Upload failed' });
    }
  
    res.status(200).json({ imageUrl: req.file.location });
  });

module.exports = router;
