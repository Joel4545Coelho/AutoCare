const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const multer = require('multer');
const path = require('path');
const authenticate = require('../middlewares/IsAuth'); // Middleware de autenticação
const upload = require('../middlewares/multer');

// Rota para atualizar o avatar
router.post('/update-avatar', authenticate, upload.single('file'), profileController.updateAvatar);

// Rota para atualizar o nome e email
router.put('/update-profile', authenticate, profileController.updateProfile);

module.exports = router;
