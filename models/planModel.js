const mongoose = require('mongoose');

const PlanoSchema = new mongoose.Schema({
  nome: String,
  descricao: String,
  preco: Number,
  beneficios: [String],
  ativo: { type: Boolean, default: true },
  level: {
    type: String,
    enum: ["basic", "premium", "medico"],
    required: true
  }
});


module.exports = mongoose.model('Plano', PlanoSchema);