const User = require("../models/user");
const upload = require("../middlewares/multer"); // Import Multer middleware
const Consultas = require("../models/consultasModel"); // Import the Consultas model

const getCurrentUser = async (req, res) => {
  const currentUser = res.locals.user; // Assuming the user is set by your auth middleware
  if (!currentUser) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }

  try {
    // Populate the medicos_associados field
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
    // Fetch all medics
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
  const avatar = req.file ? `/uploads/${req.file.filename}` : null; // Get the uploaded file path

  try {
    const medic = await User.findById(currentUser._id);
    if (!medic) {
      return res.status(404).json({ success: false, message: "Medic not found" });
    }

    if (avatar) medic.avatar = avatar; // Update avatar if a file was uploaded
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

    // Add the consulta request without associating the paciente
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
      // Update the status to "accepted" but do not associate the paciente
      request.status = "accepted";
      await medic.save();

      res.status(200).json({ success: true, message: `Consulta request ${status}` });
    } else if (status === "declined") {
      // Remove the request if it is declined
      medic.consultaRequests.pull(requestId);
      await medic.save();

      res.status(200).json({ success: true, message: `Consulta request ${status}` });
    }
  } catch (err) {
    console.error("Error handling consulta request:", err);
    res.status(500).json({ success: false, message: "Error handling consulta request" });
  }
};

const scheduleConsulta = async (req, res) => {
  const { requestId, consultaDateTime } = req.body;

  if (!requestId || !consultaDateTime) {
    return res.status(400).json({ success: false, message: 'Request ID e data/hora da consulta são obrigatórios.' });
  }

  try {
    const currentUser = res.locals.user;

    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized: User not authenticated' });
    }

    // Fetch the consulta request
    const medic = await User.findById(currentUser._id);
    const consultaRequest = medic.consultaRequests.id(requestId);

    if (!consultaRequest) {
      return res.status(404).json({ success: false, message: 'Consulta request not found.' });
    }

    // Save the consulta to the Consultas collection
    const newConsulta = new Consultas({
      clienteId: consultaRequest.from,
      medicoId: currentUser._id,
      data: consultaDateTime.split("T")[0],
      hora: consultaDateTime.split("T")[1],
    });

    await newConsulta.save();

    // Remove the consulta request from the User model
    medic.consultaRequests.pull(requestId);
    await medic.save();

    res.status(200).json({ success: true, message: 'Consulta agendada com sucesso!' });
  } catch (error) {
    console.error('Erro ao agendar a consulta:', error);
    res.status(500).json({ success: false, message: 'Ocorreu um erro ao agendar a consulta.' });
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
};