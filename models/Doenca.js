const mongoose = require("mongoose");

const DoencaSchema = new mongoose.Schema({
    doenca: {
        type: String,
        required: true,
        unique: true
    },
    perguntas: {
        type: [String],
        required: true
    }
});

const Doenca = mongoose.model("Doenca", DoencaSchema);

module.exports = Doenca;
