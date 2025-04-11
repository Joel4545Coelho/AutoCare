const express = require('express');
const router = express.Router();
const auth = require('../middlewares/IsAuth');

const { getPlanos, getPlanoAtual, assinarPlano,
    cancelarPlano, initiatePayment,
} = require('../controllers/subscriptionController');

router.get('/planos', auth, getPlanos);
router.get('/meu-plano', auth, getPlanoAtual);
router.post('/assinar', auth, assinarPlano);
router.post('/cancelar', auth, cancelarPlano);
router.post('/pagamento', auth, initiatePayment);

module.exports = router;