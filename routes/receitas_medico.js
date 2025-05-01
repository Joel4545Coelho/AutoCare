const express = require('express');
const router = express.Router();
const receita_medico = require('../controllers/receita_medico');
const auth = require("../middlewares/IsAuth");
const upload = require('../middlewares/multer');

// Rota para servir arquivos estáticos
router.use('/uploads', express.static('uploads'));

router.get('/receitas_medico/:pacienteId?', auth, receita_medico.getReceitas);
router.post('/add_receita', auth, upload.single('file'), receita_medico.addReceita);

module.exports = router;