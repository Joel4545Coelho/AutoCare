const mongoose = require("mongoose");

const medicamentosSchema = new mongoose.Schema({
    clienteId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    nome: {
        type: String,
        required: true
    },
    hora: {
        type: String,
        required: true
    },
    quantidade: {
        type: String,
        required: true
    }
});

const Medicamentos = mongoose.model("medicamentos", medicamentosSchema);

module.exports = Medicamentos;