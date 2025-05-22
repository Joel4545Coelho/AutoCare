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
    },
    status: {
        type: String,
        enum: ['pending_payment', 'scheduled', 'completed', 'canceled'],
        default: 'pending_payment'
    },
    paymentId: String,
    paymentStatus: {
        type: String,
        enum: ['initiated', 'completed', 'failed', 'refunded'],
        default: 'initiated'
    },
    price: {
        type: Number,
        required: true
    },
    additionalInfo: String
}, { timestamps: true });

const Consultas = mongoose.model("consultas", consultasSchema);

module.exports = Consultas;