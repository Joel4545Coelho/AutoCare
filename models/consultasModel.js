const mongoose = require("mongoose");

const consultasSchema = new mongoose.Schema({
    clienteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    medicoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    data: {
        type: String,
        required: true
    },
    hora: {
        type: String,
        required: true
    }
});

const Consultas = mongoose.model("consultas", consultasSchema);

module.exports = Consultas;