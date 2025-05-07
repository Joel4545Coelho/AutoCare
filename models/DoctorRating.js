const mongoose = require('mongoose');

const doctorRatingSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    validate: {
      validator: async function(doctorId) {
        const doctor = await mongoose.model('user').findById(doctorId);
        return doctor && doctor.type === "medico";
      },
      message: 'O doctorId deve referenciar um usuário do tipo médico'
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índice para garantir avaliação única por usuário
doctorRatingSchema.index({ doctorId: 1, userId: 1 }, { unique: true });

// Método para calcular média de avaliações
doctorRatingSchema.statics.getAverageRating = async function(doctorId) {
  const result = await this.aggregate([
    { $match: { doctorId: mongoose.Types.ObjectId(doctorId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        reviewsCount: { $sum: 1 }
      }
    }
  ]);

  return result.length > 0 
    ? { 
        averageRating: parseFloat(result[0].averageRating.toFixed(1)), 
        reviewsCount: result[0].reviewsCount 
      }
    : { averageRating: 0, reviewsCount: 0 };
};

module.exports = mongoose.model('DoctorRating', doctorRatingSchema);