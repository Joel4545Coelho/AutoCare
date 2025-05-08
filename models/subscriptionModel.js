const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plano', required: true },
  dataInicio: { type: Date, required: true },
  dataFim: { type: Date, required: true },
  status: {
    type: String,
    enum: ['active', 'pending', 'pending_payment', 'canceled', 'expired'],
    default: 'pending_payment'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'initiated', 'completed', 'failed', 'refunded'],
    default: 'initiated'
  },
  level: { type: String, enum: ['basic', 'premium', 'medico'], required: true },
  easypayId: { type: String },
  easypayCheckoutId: { type: String },
  transactionKey: { type: String },
  lastChecked: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);