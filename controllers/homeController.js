const Consulta = require("../models/consultasModel"); // Modelo do banco de dados
const Medicamento = require("../models/medicamentosModel");
const User = require("../models/user");

const getConsultas = async (req, res) => {
  try {
    const consultas = await Consulta.find()
      .populate("medicoId", "username")

    console.log("Consultas encontradas =>", consultas);
    res.json(consultas);
  } catch (error) {
    console.error("Erro ao buscar consultas:", error);
    res.status(500).json({ error: "Erro ao buscar consultas" });
  }
};

const getConsultas2 = async (req, res) => {
  try {
    const consultas = await Consulta.find()
      .populate("clienteId", "username")

    console.log("Consultas encontradas =>", consultas);
    res.json(consultas);
  } catch (error) {
    console.error("Erro ao buscar consultas:", error);
    res.status(500).json({ error: "Erro ao buscar consultas" });
  }
};

const getMedicamentos = async (req,res) => {
  var medicamentos = null
  try {
    medicamentos = await Medicamento.find();
    console.log("Medicamentos:", medicamentos);
    res.json(medicamentos);
  } catch (error) {
    console.error("Erro ao buscar medicamentos:", error);
    res.status(500).json({ error: "Erro ao buscar medicamentos" });
  }
};

const getHomeData = async (req, res) => {
  try {
    const CurrentUser = res.locals.user;
    const CurrentUserId = CurrentUser._id;
    
    if (CurrentUser.type !== "paciente") {
      return res.status(403).json({ error: "Forbidden: Only pacientes can access this page" });
    }

    const [consultas, medicamentos] = await Promise.all([
      getConsultas(CurrentUserId),
      getMedicamentos(CurrentUserId)
    ]);

    res.render("home/index", { consultas, medicamentos, userType: CurrentUser.type });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao carregar os dados");
  }
};

// Função para adicionar um medicamento
const addMedicamento = async (req, res) => {
  console.log(req.body);

  var CurrentUser = res.locals.user; 

  if (!CurrentUser) {
    return res.status(401).json({ message: "Usuário não autenticado" });
  }

  var clienteId = CurrentUser._id;

  try {
    const novoMedicamento = await Medicamento.create({ 
      clienteId, 
      ...req.body 
    });
    console.log("Medicamento inserido =>", novoMedicamento);
    res.send({
      message: "Medicamento inserido com sucesso",
      medicamento: novoMedicamento,
    });
  } catch (error) {
    console.error("Erro ao adicionar medicamento:", error);
    res.status(500).json({ message: "Erro ao adicionar medicamento" });
  }
};

// Função para excluir um medicamento
const deleteMedicamento = async (req, res) => {
  console.log(req.query.id);
  try {
    const deleteResult = await Medicamento.findByIdAndDelete(req.query.id);
    console.log("Deleted documents =>", deleteResult);
    res.send(deleteResult);
  } catch (error) {
    console.error("Erro ao excluir medicamento:", error);
    res.status(500).send("Erro ao excluir o medicamento");
  }
};

// Função para editar um medicamento
const editMedicamento = async (req, res) => {
  const { _id, nome, hora, quantidade } = req.body;

  if (!_id) {
    return res.status(400).json({ error: "ID do medicamento é obrigatório" });
  }

  try {
    const updateResult = await Medicamento.findByIdAndUpdate(
      _id, 
      { nome, hora, quantidade }, 
      { new: true }
    );

    if (!updateResult) {
      return res.status(404).json({ error: "Medicamento não encontrado" });
    }

    console.log("Updated documents =>", updateResult);
    res.json({ message: "Medicamento editado com sucesso", medicamento: updateResult });
  } catch (error) {
    console.error("Erro ao editar medicamento:", error);
    res.status(500).json({ error: "Erro ao editar o medicamento." });
  }
};

module.exports = { getHomeData, addMedicamento, deleteMedicamento, editMedicamento, getMedicamentos, getConsultas, getConsultas2 };