const receitaMedico = require("../models/receita");
const fs = require('fs');
const path = require('path');

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
    
    // Verifica se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo foi enviado." });
    }

    const novaReceita = new receitaMedico({
      description,
      medicoId,
      pacienteId,
      file: req.file.path, // Caminho do arquivo salvo
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size
    });

    await novaReceita.save();

    res.status(201).json({ 
      success: true, 
      data: {
        ...novaReceita.toObject(),
        fileUrl: `${req.protocol}://${req.get('host')}/${req.file.path.replace(/\\/g, '/')}`
      }
    });
  } catch (error) {
    console.error("Erro ao adicionar receita:", error);
    
    // Se ocorrer um erro, remove o arquivo enviado
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Erro ao remover arquivo:", err);
      });
    }
    
    res.status(500).json({ error: "Erro ao adicionar receita." });
  }
};

module.exports = { getReceitas, addReceita };