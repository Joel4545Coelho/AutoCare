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
  avatar: { type: String, required: false },
  doenca: { type: Array },
  pacientes_associados: [{ type: mongoose.Schema.Types.ObjectId }],
  tokens_associados: [{ type: mongoose.Schema.Types.String, required: false }],
  medicos_associados: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  expecialidade: { type: String },
  pconsulta: { type: Number, default: 80 },
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
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("user", UserSchema);
module.exports = User;