const express = require('express');
const router = express.Router();
const receita_medico = require('../controllers/receita_medico');
const auth = require("../middlewares/IsAuth")



router.get('/receitas_medico/:pacienteId?', receita_medico.getReceitas);
router.post('/add_receita', auth,  receita_medico.addReceita);

module.exports = router;