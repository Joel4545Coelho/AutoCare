const express = require("express");
const router = express.Router();
const auth = require("../middlewares/IsAuth");
const { listMedics, sendMessageRequest, listMessageRequests,
    handleMessageRequest, updateProfile, listMedicsN,
    listMessageRequestsN, sendConsultaRequest, listConsultaRequests,
    handleConsultaRequest, scheduleConsulta, getCurrentUser,
    getPatientConsultaRequests, getConsultaDetails, initiatePayment, paymentCallback,
    getPatientConsultas,checkConsultaUpdates,getMedicConsultas,


} = require("../controllers/requestsController");
const upload = require("../middlewares/multer"); // Import Multer middleware

const { 
    createConsultaPayment, 
    verifyConsultaPayment,
    handlePaymentCallback
} = require("../controllers/easysinglecontroller");


router.get("/currentUser", auth, getCurrentUser);
// Routes for message requests
router.get("/medics", auth, listMedics); // List all medics
router.get("/medicsN", auth, listMedicsN);
router.post("/sendRequest", auth, sendMessageRequest); // Send a message request
router.get("/messageRequests", auth, listMessageRequests); // List message requests for a medic
router.get("/messageRequestsN", auth, listMessageRequestsN); // List message requests for a medic
router.post("/handleRequest", auth, handleMessageRequest); // Handle a message request (accept/decline)
router.post("/updateProfile", auth, upload.single("avatar"), updateProfile);

// Routes for consulta requests
router.post("/sendConsultaRequest", auth, sendConsultaRequest); // Send a consulta request
router.get("/consultaRequests", auth, listConsultaRequests); // List consulta requests for a medic
router.post("/handleConsultaRequest", auth, handleConsultaRequest); // Handle a consulta request (accept/decline)
router.post("/scheduleConsulta", auth, scheduleConsulta); // Schedule a consulta
router.get('/patientConsultaRequests', auth, getPatientConsultaRequests);
router.get('/patientConsultas', auth, getPatientConsultas);
router.get('/consultaDetails/:consultaId', auth, getConsultaDetails);
router.post('/initiatePayment', auth, initiatePayment);
router.get('/payment/callback', auth, paymentCallback);
router.get('/checkConsultaUpdates', auth, checkConsultaUpdates);
router.get('/medicConsultas', auth, getMedicConsultas);

// Single payment routes
router.post('/consulta/payment', auth, createConsultaPayment);
router.get('/consulta/payment/:paymentId', auth, verifyConsultaPayment);
router.get('/payment/callback', handlePaymentCallback); 
router.post('/consulta/verify-payment', easysinglecontroller.verifyPayment);
module.exports = router;