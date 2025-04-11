const mongoose = require('mongoose');

const planoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: { type: String, required: true },
  preco: { type: Number, required: true },
  duracao: { type: String, enum: ['mensal', 'trimestral', 'anual'], required: true },
  beneficios: [{ type: String }],
  ativo: { type: Boolean, default: true }
});

module.exports = mongoose.model('Plano', planoSchema);