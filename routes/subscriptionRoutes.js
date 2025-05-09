const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const easyController = require('../controllers/easyController');
const auth = require("../middlewares/IsAuth");

router.get('/planos', auth, subscriptionController.getPlanos);
router.get('/meu-plano', auth, subscriptionController.getPlanoAtual);
router.post('/assinar', auth, subscriptionController.assinarPlano);
router.post('/cancelar', auth, subscriptionController.cancelarPlano);
router.post('/pagamento', auth, subscriptionController.initiatePayment);

// EasyPay routes
router.post('/assinar-easypay', auth, easyController.createEasyPaySubscription);
router.get('/check-status/:subscriptionId', auth, easyController.checkSubscriptionStatus);
router.post('/cancel-pending/:subscriptionId', auth, easyController.cancelPendingSubscription);

module.exports = router;