const mongoose = require('mongoose');
 
const ReceitaSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  medicoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  pacienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  file: {
    type: String, 
    required: true
  }
}, { timestamps: true }); 
 
module.exports = mongoose.model('Receita', ReceitaSchema);