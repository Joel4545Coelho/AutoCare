const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const auth = require("../middlewares/IsAuth")


// Rota principal para exibir os dados
router.get('/home',auth, homeController.getHomeData);

router.get('/consultas',auth, homeController.getConsultas);
router.get('/consultas2',auth, homeController.getConsultas2);

router.get('/medicamentos',auth, homeController.getMedicamentos);

// Rota para adicionar medicamentos
router.post('/add-medicamento',auth, homeController.addMedicamento);

// Rota para excluir medicamentos
router.get('/delete-medicamento',auth, homeController.deleteMedicamento);

// Rota para editar medicamentos
router.post('/edit-medicamento',auth, homeController.editMedicamento);

module.exports = router;
