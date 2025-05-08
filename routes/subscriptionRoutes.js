// routes/subscriptionRoutes.js
const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const easypayController = require('../controllers/easypayController');
const { auth } = require('../middleware/authMiddleware');

router.get('/planos', auth, subscriptionController.getPlanos);
router.get('/meu-plano', auth, subscriptionController.getPlanoAtual);
router.post('/assinar', auth, subscriptionController.assinarPlano);
router.post('/cancelar', auth, subscriptionController.cancelarPlano);

// EasyPay routes
router.post('/assinar-easypay', auth, easypayController.createEasyPaySubscription);
router.get('/check-status/:subscriptionId', auth, easypayController.checkSubscriptionStatus);

module.exports = router;