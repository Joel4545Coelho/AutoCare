const Consulta = require("../models/consultasModel"); // Modelo do banco de dados
const Medicamento = require("../models/medicamentosModel");
const User = require("../models/user");

const getConsultas = async (req, res) => {
  try {
    const consultas = await Consulta.find()
      .populate("medicoId", "username")

    
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

    
    res.json(consultas);
  } catch (error) {
    console.error("Erro ao buscar consultas:", error);
    res.status(500).json({ error: "Erro ao buscar consultas" });
  }
};

const getConsultasDoMedico = async (req, res) => {
  try {
    const { medicoId } = req.params;

    const consultas = await Consulta.find({ medicoId });
    res.json({ success: true, data: consultas });
  } catch (error) {
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
  const { id } = req.params;  // Usar req.params para pegar o parâmetro 'id' da URL
  console.log("ID do medicamento a ser excluído:", id);  // Verificando o id no log
  
  try {
    const deleteResult = await Medicamento.findByIdAndDelete(id);  // Deletando o medicamento com o id
    
    // Verifica se o medicamento foi encontrado e excluído
    if (!deleteResult) {
      console.log("Medicamento não encontrado com o ID:", id);
      return res.status(404).send("Medicamento não encontrado");
    }
    
    console.log("Medicamento excluído com sucesso:", deleteResult);
    res.status(200).send(deleteResult);  // Envia a resposta com o resultado da exclusão
  } catch (error) {
    console.error("Erro ao excluir medicamento:", error);
    res.status(500).send("Erro ao excluir o medicamento");
  }
};

// Função para editar um medicamento
const editMedicamento = async (req, res) => {
  const { _id, nome, hora, quantidade, data_inicio, data_fim } = req.body;

  // 👇 Validação do campo hora
  if (hora && typeof hora !== 'string') {
    return res.status(400).json({ error: "Formato inválido para 'hora'. Use 'HH:mm,HH:mm'." });
  }

  try {
    const updateResult = await Medicamento.findByIdAndUpdate(
      _id,
      { nome, hora, quantidade, data_inicio, data_fim },
      { new: true }
    );

    res.json({ message: "Medicamento atualizado!", medicamento: updateResult });
  } catch (error) {
    console.error("Erro ao editar medicamento:", error);
    res.status(500).json({ error: "Erro ao atualizar o medicamento." });
  }
  console.log("Hora recebida:", req.body.hora);
};

module.exports = { getHomeData, addMedicamento, deleteMedicamento, editMedicamento, getMedicamentos, getConsultas, getConsultas2, getConsultasDoMedico };