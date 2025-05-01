const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["paciente", "admin", "medico", "organizacao"],
  },
  avatar: { type: Buffer,required: false},
  doenca: { type: Array },
  pacientes_associados: [{ type: mongoose.Schema.Types.ObjectId }],
  medicos_associados: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }], // Use "user" instead of "User"
  expecialidade: { type: String },
  messageRequests: [
    {
      from: { type: mongoose.Schema.Types.ObjectId, ref: "user" }, // Use "user" instead of "User"
      status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
      reason: { type: String },
    },
  ],
  consultaRequests: [
    {
      from: { type: mongoose.Schema.Types.ObjectId, ref: "user" }, // Use "user" instead of "User"
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
}, { timestamps: true });

const User = mongoose.model("user", UserSchema);
module.exports = User;
