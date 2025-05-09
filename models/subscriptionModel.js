const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  planoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plano' },
  dataInicio: { type: Date, default: Date.now },
  dataFim: { type: Date, required: true },
  status: { type: String, enum: ['active', 'canceled', 'expired'], default: 'active' },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  level: { type: String, enum: ["free", "basic", "premium", "medico"], required: true }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);