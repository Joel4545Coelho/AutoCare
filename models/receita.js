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
    ref: 'user', // ou 'Patient'
    required: true
  },
  file: {
    type: String, // URL do ficheiro (podes usar upload para armazenar no servidor ou cloud)
    required: true
  }
}, { timestamps: true }); // cria automaticamente createdAt e updatedAt

module.exports = mongoose.model('Receita', ReceitaSchema);
