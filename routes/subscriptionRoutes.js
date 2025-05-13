const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const easysubsController = require('../controllers/easysubsController');
const auth = require("../middlewares/IsAuth");

router.get('/planos', auth, subscriptionController.getPlanos);
router.get('/meu-plano', auth, subscriptionController.getPlanoAtual);
router.post('/assinar', auth, subscriptionController.assinarPlano);
router.post('/cancelar', auth, subscriptionController.cancelarPlano);
router.post('/pagamento', auth, subscriptionController.initiatePayment);

// EasyPay routes
router.post('/assinar-easypay', auth, easysubsController.createEasyPaySubscription);
router.get('/check-status/:subscriptionId', auth, easysubsController.checkSubscriptionStatus);
router.post('/cancel-pending', auth, easysubsController.cancelPendingSubscription);
router.post('/easypay/verify-subscription', auth, easysubsController.verifySubscription);

module.exports = router;