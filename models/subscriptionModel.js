const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  planoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plano' },
  dataInicio: { type: Date, default: Date.now },
  dataFim: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['active', 'canceled', 'expired', 'pending'], 
    default: 'pending' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'], 
    default: 'pending' 
  },
  level: { 
    type: String, 
    enum: ["free", "basic", "premium", "medico"], 
    required: true 
  },
  easypayId: String // Make sure this field exists for storing EasyPay ID
}, { timestamps: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);