// routes/receitaRoutes.js
const express = require('express');
const router = express.Router();
const receitaController = require('../controllers/PacienteReceitasController');

router.get('/receita/:pacienteId', receitaController.getReceitasByPaciente);

module.exports = router;
