const receitaMedico = require("../models/receita");


const getReceitas = async (req, res) => {
    try {
      const { pacienteId } = req.params;
  
      let receitas;
      if (pacienteId) {
        receitas = await receitaMedico.find({ pacienteId });
      } else {
        receitas = await receitaMedico.find(); 
      }
  
      res.json({ success: true, data: receitas });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar receitas" });
    }
  };


  const addReceita = async (req, res) => {
    try {
      const { description, medicoId, pacienteId, file } = req.body;
  
      const novaReceita = new receitaMedico({
        description,
        medicoId,
        pacienteId,
        file
      });
  
      await novaReceita.save();
  
      res.status(201).json({ success: true, data: novaReceita });
    } catch (error) {
      console.error("Erro ao adicionar receita:", error);
      res.status(500).json({ error: "Erro ao adicionar receita." });
    }
  };
  module.exports = {getReceitas, addReceita}
  