const mongoose = require('mongoose');

const ReceitaSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  medicoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // ou 'Doctor', dependendo da tua estrutura
    required: true
  },
  pacienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', 
    required: true
  },
  fileUrl:{
    type: String,
    required: false 
  },
  file: {
    type: String, // Armazenaremos o caminho do arquivo
    required: false // Tornamos opcional para flexibilidade
  },
  fileName: {
    type: String,
    required: false
  },
  fileType: {
    type: String,
    required: false
  },
  fileSize: {
    type: Number,
    required: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Receita', ReceitaSchema);
