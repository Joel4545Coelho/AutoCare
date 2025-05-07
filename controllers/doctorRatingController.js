const DoctorRating = require('../models/DoctorRating');
const User = require('../models/user');
const { ErrorResponse } = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Obter avaliação média de um médico
// @route   GET /api/v1/doctors/:doctorId/rating
// @access  Private
exports.getDoctorRating = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;

  // Verificar se o usuário é um médico
  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.type !== "medico") {
    return next(new ErrorResponse('O ID fornecido não pertence a um médico', 404));
  }

  const ratingData = await DoctorRating.getAverageRating(doctorId);

  res.status(200).json({
    success: true,
    data: ratingData
  });
});

// @desc    Avaliar um médico
// @route   POST /api/v1/doctors/:doctorId/rating
// @access  Private
exports.submitDoctorRating = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const { rating } = req.body;
  const userId = req.user.id;

  // Verificar se o rating é válido
  if (rating < 1 || rating > 5) {
    return next(new ErrorResponse('A avaliação deve ser entre 1 e 5 estrelas', 400));
  }

  // Verificar se o usuário é um médico
  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.type !== "medico") {
    return next(new ErrorResponse('O ID fornecido não pertence a um médico', 404));
  }

  // Verificar se não está avaliando a si mesmo
  if (doctorId === userId.toString()) {
    return next(new ErrorResponse('Você não pode se autoavaliar', 400));
  }

  // Criar ou atualizar avaliação
  let existingRating = await DoctorRating.findOne({ doctorId, userId });

  if (existingRating) {
    existingRating.rating = rating;
    await existingRating.save();
  } else {
    existingRating = await DoctorRating.create({ doctorId, userId, rating });
  }

  // Recalcular a média
  const ratingData = await DoctorRating.getAverageRating(doctorId);

  res.status(200).json({
    success: true,
    data: ratingData
  });
});