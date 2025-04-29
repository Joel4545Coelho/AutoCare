const receitaMedico = require("../models/receita_medico");


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
  