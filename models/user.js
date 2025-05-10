// models/user.js
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["paciente", "admin", "medico", "organizacao"],
  },
  avatar: { type: Buffer, required: false },
  doenca: { type: Array },
  pacientes_associados: [{ type: mongoose.Schema.Types.ObjectId }],
  medicos_associados: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  expecialidade: { type: String },
  messageRequests: [
    {
      from: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
      status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
      reason: { type: String },
    },
  ],
  consultaRequests: [
    {
      from: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
      status: { type: String, default: "pending" },
      optimalTime: String,
      additionalInfo: String,
      scheduledDateTime: String,
    },
  ],
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  sublevel: {
    type: String,
    enum: ["free", "basic", "premium", "medico"],
    default: "free"
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { timestamps: true });

// Hash da senha antes de salvar
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Método para comparar senhas
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("user", UserSchema);
module.exports = User;