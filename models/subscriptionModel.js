const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  planoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plano', required: true },
  dataInicio: { type: Date, default: Date.now },
  dataFim: { type: Date, required: true },
  status: { type: String, enum: ['active', 'canceled', 'expired'], default: 'active' },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
});

module.exports = mongoose.model('Subscription', subscriptionSchema);