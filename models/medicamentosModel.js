const mongoose = require("mongoose");

const medicamentosSchema = new mongoose.Schema({
    clienteId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
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
    },
    data_inicio: {
        type: String,
        required: false
    },
    data_fim: {
        type: String,
        required: false

    }
});

const Medicamentos = mongoose.model("medicamentos", medicamentosSchema);

module.exports = Medicamentos;