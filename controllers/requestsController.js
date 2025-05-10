const User = require("../models/user");
const upload = require("../middlewares/multer");
const Consultas = require("../models/consultasModel");
 
const getCurrentUser = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }
 
  try {
    const user = await User.findById(currentUser._id).populate("medicos_associados");
    res.json(user);
  } catch (err) {
    console.error("Error fetching current user:", err);
    res.status(500).json({ success: false, message: "Error fetching current user" });
  }
};
 
const listMedics = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }
  const userType = currentUser.type;
 
  if (currentUser.type !== "paciente") {
    return res.status(403).json({ error: "Forbidden: Only pacientes can access this page" });
  }
 
  try {
    const medics = await User.find({ type: "medico" });
 
    res.json({ medics, title: "Available Medics", userType });
  } catch (err) {
    console.error("Error fetching medics:", err);
    res.status(500).json({ success: false, message: "Error fetching medics" });
  }
};
 
const listMedicsN = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }
  const userType = currentUser.type;
 
  if (currentUser.type !== "paciente") {
    return res.status(403).json({ error: "Forbidden: Only pacientes can access this page" });
  }
 
  try {
    const paciente = await User.findById(currentUser._id).populate("medicos_associados");
 
    const associatedMedicIds = paciente.medicos_associados.map(medic => medic._id);
 
    const medics = await User.find({
      type: "medico",
      _id: { $nin: associatedMedicIds },
    });
 
    res.render("requests/indexM", { medics, title: "Available Medics", userType });
  } catch (err) {
    console.error("Error fetching medics:", err);
    res.status(500).json({ success: false, message: "Error fetching medics" });
  }
};
 
const sendMessageRequest = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }
 
  const { medicoId, reason } = req.body;
  const pacienteId = currentUser._id;
 
  try {
    const medic = await User.findById(medicoId);
    if (!medic) {
      return res.status(404).json({ success: false, message: "Medic not found" });
    }
 
    medic.messageRequests.push({ from: pacienteId, status: "pending", reason });
    await medic.save();
 
    res.status(200).json({ success: true, message: "Message request sent" });
  } catch (err) {
    console.error("Error sending message request:", err);
    res.status(500).json({ success: false, message: "Error sending message request" });
  }
};
 
const listMessageRequests = async (req, res) => {
  const currentUser = res.locals.user;
  const userType = currentUser.type;
  if (!currentUser || currentUser.type !== "medico") {
    return res.status(401).json({ error: "Unauthorized: Only medics can view message requests" });
  }
 
  try {
    const medic = await User.findById(currentUser._id).populate("messageRequests.from");
    res.json({
      requests: medic.messageRequests,
      currentMedic: medic,
      title: "Message Requests",
      userType: userType,
    });
  } catch (err) {
    console.error("Error fetching message requests:", err);
    res.status(500).json({ success: false, message: "Error fetching message requests" });
  }
};
 
const listMessageRequestsN = async (req, res) => {
  const currentUser = res.locals.user;
  const userType = currentUser.type;
  if (!currentUser || currentUser.type !== "medico") {
    return res.status(401).json({ error: "Unauthorized: Only medics can view message requests" });
  }
 
  try {
    const medic = await User.findById(currentUser._id).populate("messageRequests.from");
    res.render("requests/indexP", {
      requests: medic.messageRequests,
      currentMedic: medic,
      title: "Message Requests",
      userType: userType,
    });
  } catch (err) {
    console.error("Error fetching message requests:", err);
    res.status(500).json({ success: false, message: "Error fetching message requests" });
  }
};
 
const handleMessageRequest = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser || currentUser.type !== "medico") {
    return res.status(401).json({ error: "Unauthorized: Only medics can handle message requests" });
  }
 
  const { requestId, status } = req.body;
 
  try {
    const medic = await User.findById(currentUser._id);
    const request = medic.messageRequests.id(requestId);
 
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
 
    if (status === "accepted") {
      medic.pacientes_associados.push(request.from);
      await User.findByIdAndUpdate(request.from, {
        $push: { medicos_associados: currentUser._id },
      });
    }
 
    medic.messageRequests.pull(requestId);
    await medic.save();
 
    res.status(200).json({ success: true, message: `Request ${status}` });
  } catch (err) {
    console.error("Error handling message request:", err);
    res.status(500).json({ success: false, message: "Error handling message request" });
  }
};
 
const updateProfile = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser || currentUser.type !== "medico") {
    return res.status(401).json({ error: "Unauthorized: Only medics can update their profile" });
  }
 
  const { expecialidade } = req.body;
  const avatar = req.file ? `/uploads/${req.file.filename}` : null;
 
  try {
    const medic = await User.findById(currentUser._id);
    if (!medic) {
      return res.status(404).json({ success: false, message: "Medic not found" });
    }
 
    if (avatar) medic.avatar = avatar;
    if (expecialidade) medic.expecialidade = expecialidade;
 
    await medic.save();
    res.status(200).json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ success: false, message: "Error updating profile" });
  }
};
 
const sendConsultaRequest = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }
 
  const { medicoId, additionalInfo } = req.body;
  const pacienteId = currentUser._id;
 
  try {
    const medic = await User.findById(medicoId);
    if (!medic) {
      return res.status(404).json({ success: false, message: "Medic not found" });
    }
    medic.consultaRequests.push({
      from: pacienteId,
      status: "pending",
      additionalInfo,
    });
    await medic.save();
 
    res.status(200).json({ success: true, message: "Consulta request sent" });
  } catch (err) {
    console.error("Error sending consulta request:", err);
    res.status(500).json({ success: false, message: "Error sending consulta request" });
  }
};
 
const listConsultaRequests = async (req, res) => {
  const currentUser = res.locals.user;
  const userType = currentUser.type;
  if (!currentUser || currentUser.type !== "medico") {
    return res.status(401).json({ error: "Unauthorized: Only medics can view consulta requests" });
  }
 
  try {
    console.log("Fetching consulta requests for medic:", currentUser._id);
    const medic = await User.findById(currentUser._id).populate("consultaRequests.from");
    if (!medic) {
      console.error("Medic not found:", currentUser._id);
      return res.status(404).json({ success: false, message: "Medic not found" });
    }
 
    console.log("Consulta requests:", medic.consultaRequests);
    res.json({
      requests: medic.consultaRequests,
      currentMedic: medic,
      title: "Consulta Requests",
      userType: userType,
    });
  } catch (err) {
    console.error("Error fetching consulta requests:", err);
    res.status(500).json({ success: false, message: "Error fetching consulta requests" });
  }
};
 
const handleConsultaRequest = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser || currentUser.type !== "medico") {
    return res.status(401).json({ error: "Unauthorized: Only medics can handle consulta requests" });
  }
 
  const { requestId, status } = req.body;
 
  try {
    const medic = await User.findById(currentUser._id);
    const request = medic.consultaRequests.id(requestId);
 
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
 
    if (status === "accepted") {
      request.status = "accepted";
      await medic.save();
     
      return res.status(200).json({
        success: true,
        message: `Consulta request ${status}`,
        requestId: requestId
      });
    } else if (status === "declined") {
      medic.consultaRequests.pull(requestId);
      await medic.save();
      return res.status(200).json({ success: true, message: `Consulta request ${status}` });
    }
  } catch (err) {
    console.error("Error handling consulta request:", err);
    res.status(500).json({ success: false, message: "Error handling consulta request" });
  }
};
 
const scheduleConsulta = async (req, res) => {
    const { requestId, consultaDateTime } = req.body;

    try {
        const currentUser = res.locals.user;
        const medic = await User.findById(currentUser._id);
        const request = medic.consultaRequests.id(requestId);

        const patient = await User.findById(request.from);

        const newConsulta = new Consultas({
            clienteId: request.from,
            medicoId: currentUser._id,
            data: consultaDateTime.split('T')[0],
            hora: consultaDateTime.split('T')[1].split('.')[0],
            status: 'pending_payment',
            price: medic.pconsulta || 80,
            additionalInfo: request.additionalInfo
        });

        await newConsulta.save();

        medic.consultaRequests.pull(requestId);
        await medic.save();

        res.status(200).json({
            success: true,
            consultaId: newConsulta._id
        });
    } catch (error) {
        console.error('Error scheduling consulta:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error scheduling consulta',
            error: error.message 
        });
    }
};
 
const getPatientConsultaRequests = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }
 
  try {
    // Find all consulta requests where this patient is the requester
    const medics = await User.find({
      'consultaRequests.from': currentUser._id
    }).select('_id consultaRequests');
 
    // Extract relevant information
    const requests = medics.flatMap(medic =>
      medic.consultaRequests
        .filter(req => req.from.equals(currentUser._id))
        .map(req => ({
          medicoId: medic._id,
          status: req.status,
          consultaId: req._id
        }))
    );
 
    res.status(200).json({ requests });
  } catch (error) {
    console.error('Error fetching patient consulta requests:', error);
    res.status(500).json({ success: false, message: 'Error fetching requests' });
  }
};
 
const getConsultaDetails = async (req, res) => {
  try {
    const { consultaId } = req.params;  // Changed from medicoId to consultaId
    const currentUser = res.locals.user;
 
    // Find the consulta by its ID and verify the patient matches
    const consulta = await Consultas.findOne({
      _id: consultaId,
      clienteId: currentUser._id,
      status: 'pending_payment'
    }).populate('medicoId');
 
    if (!consulta) {
      return res.status(404).json({ success: false, message: 'Consulta not found' });
    }
 
    res.status(200).json({ consulta });
  } catch (error) {
    console.error('Error fetching consulta details:', error);
    res.status(500).json({ success: false, message: 'Error fetching consulta' });
  }
};
 
const initiatePayment = async (req, res) => {
  try {
    const { consultaId } = req.body;
    const currentUser = res.locals.user;
 
    // Verify consulta exists and belongs to this user
    const consulta = await Consultas.findOne({
      _id: consultaId,
      clienteId: currentUser._id,
      status: 'pending_payment'
    });
 
    if (!consulta) {
      return res.status(404).json({ success: false, message: 'Consulta not found' });
    }
 
    // Mark as paid immediately (mock payment)
    await Consultas.findByIdAndUpdate(consultaId, {
      paymentStatus: 'completed',
      status: 'scheduled'
    });
 
    res.status(200).json({
      success: true,
      // Changed to use frontend route
      redirectTo: `/payment/confirmation?success=true&consultaId=${consultaId}`
    });
 
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(200).json({
      success: false,
      redirectTo: '/payment/confirmation?success=false'
    });
  }
};
 
// Add payment callback handler
const paymentCallback = async (req, res) => {
  try {
    const { consultaId, status } = req.query;
 
    // Verify payment with EasyPay
    // This should be replaced with actual verification code
    const paymentVerified = status === 'success'; // Mock verification
 
    if (paymentVerified) {
      await Consultas.findByIdAndUpdate(consultaId, {
        paymentStatus: 'completed',
        status: 'scheduled'
      });
 
      // Notify patient and medic
      // Add notification logic here
 
      return res.redirect('/payment/success');
    } else {
      await Consultas.findByIdAndUpdate(consultaId, {
        paymentStatus: 'failed'
      });
      return res.redirect('/payment/failed');
    }
  } catch (error) {
    console.error('Error handling payment callback:', error);
    return res.redirect('/payment/error');
  }
};
 
const getPatientConsultas = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }
 
  try {
    const { status } = req.query;
    const query = { clienteId: currentUser._id };
   
    if (status) {
      query.status = status;
    }
 
    const consultas = await Consultas.find(query).populate('medicoId');
    res.status(200).json({ consultas });
  } catch (error) {
    console.error('Error fetching patient consultas:', error);
    res.status(500).json({ success: false, message: 'Error fetching consultas' });
  }
};
 
const checkConsultaUpdates = async (req, res) => {
  try {
    const lastChecked = req.query.lastChecked || new Date(0);
    const updated = await Consultas.exists({
      clienteId: req.user._id,
      updatedAt: { $gt: new Date(lastChecked) }
    });
   
    res.json({ updated: !!updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error checking updates" });
  }
};
 
const getMedicConsultas = async (req, res) => {
  const currentUser = res.locals.user;
  if (!currentUser || currentUser.type !== "medico") {
    return res.status(401).json({ error: "Unauthorized: Only medics can view consultas" });
  }
 
  try {
    const { status } = req.query;
    const query = {
      medicoId: currentUser._id,
      ...(status && { status }) // Add status to query if provided
    };
 
    const consultas = await Consultas.find(query)
      .populate('clienteId', 'username email'); // Only populate necessary fields
 
    res.status(200).json({ consultas });
  } catch (error) {
    console.error('Error fetching medic consultas:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching consultas',
      error: error.message // Include error message for debugging
    });
  }
};
 
module.exports = {
  listMedics,
  sendMessageRequest,
  listMessageRequests,
  handleMessageRequest,
  updateProfile,
  listMedicsN,
  listMessageRequestsN,
  sendConsultaRequest,
  listConsultaRequests,
  handleConsultaRequest,
  scheduleConsulta,  
  getCurrentUser,
  getPatientConsultaRequests,
  getConsultaDetails,
  initiatePayment,
  paymentCallback,
  getPatientConsultas,
  checkConsultaUpdates,
  getMedicConsultas,
};