const express = require('express');
const router = express.Router();
const receita_medico = require('../controllers/receita_medico');
const auth = require("../middlewares/IsAuth")



router.get('/receitas_medico/:pacienteId',auth, receita_medico.getReceitas);

module.exports = router;