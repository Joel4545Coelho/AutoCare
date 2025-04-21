const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const multer = require('multer');
const path = require('path');
const authenticate = require('../middlewares/IsAuth'); // Middleware de autenticação

// Configuração do Multer para o upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

// Rota para atualizar o avatar
router.post('/update-avatar', authenticate, upload.single('avatar'), profileController.updateAvatar);

// Rota para atualizar o nome e email
router.put('/update-profile', authenticate, profileController.updateProfile);

module.exports = router;
