const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    maxlength: 500,
  },
}, { timestamps: true });

// Prevent duplicate ratings from the same user for the same doctor
ratingSchema.index({ doctor: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);