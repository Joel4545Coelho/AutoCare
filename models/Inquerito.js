const mongoose = require("mongoose");

const InqueritoSchema = new mongoose.Schema({
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  doenca: { type: String, required: true },
  sintomas: [
    {
      nome: String,
      escala: Number,
    },
  ],
},
{ timestamps: true }
);

module.exports = mongoose.model("Inquerito", InqueritoSchema);
