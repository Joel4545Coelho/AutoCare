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
      const { description, medicoId, pacienteId } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo foi enviado." });
      }
      console.log("Uploaded file info:", req.file);

      const novaReceita = new receitaMedico({
        description,
        medicoId,
        pacienteId,
        fileUrl: req.file.location, // S3 public URL
        fileName: req.file.key,
        fileType: req.file.mimetype,
        fileSize: req.file.size
      });

      await novaReceita.save();

      res.status(201).json({
        success: true,
        data: novaReceita
      });
    } catch (error) {
      console.error("Erro ao adicionar receita:", error);
      res.status(500).json({ error: "Erro ao adicionar receita." });
    }
  };

module.exports = { getReceitas, addReceita };