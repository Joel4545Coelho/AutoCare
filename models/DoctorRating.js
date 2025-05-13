import mongoose from 'mongoose';

const doctorRatingSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    validate: {
      validator: async function (doctorId) {
        const doctor = await mongoose.model('user').findById(doctorId);
        return doctor && doctor.type === "medico";
      },
      message: 'O doctorId deve referenciar um usuário do tipo médico',
    },
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
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
    required: false, // Alterado para false para permitir comentário vazio ou ausente
    maxlength: 500,
    trim: true,
    default: null, // Adicionado valor padrão
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

doctorRatingSchema.index({ doctorId: 1, userId: 1 }, { unique: true });

doctorRatingSchema.statics.getAverageRating = async function (doctorId) {
  const result = await this.aggregate([
    { $match: { doctorId: new mongoose.Types.ObjectId(doctorId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        reviewsCount: { $sum: 1 },
      },
    },
  ]);

  return result.length > 0
    ? {
        averageRating: parseFloat(result[0].averageRating.toFixed(1)),
        reviewsCount: result[0].reviewsCount,
      }
    : { averageRating: 0, reviewsCount: 0 };
};

const DoctorRating = mongoose.model('DoctorRating', doctorRatingSchema);
export default DoctorRating;