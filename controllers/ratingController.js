import DoctorRating from '../models/DoctorRating.js';
import User from '../models/user.js';

export const submitDoctorRating = async (req, res) => {
  const { doctorId } = req.params;
  const { rating, comment } = req.body;
  const currentUser = res.locals.user;

  if (!currentUser) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      error: 'Nota inválida',
      message: 'A nota deve ser um número entre 1 e 5'
    });
  }

  if (comment && comment.length > 500) {
    return res.status(400).json({
      error: 'Comentário muito longo',
      message: 'O comentário não pode exceder 500 caracteres'
    });
  }

  try {
    const doctor = await User.findOne({
      _id: doctorId,
      type: 'medico'
    });

    if (!doctor) {
      return res.status(404).json({
        error: 'Médico não encontrado',
        message: 'O ID fornecido não corresponde a um médico válido'
      });
    }

    if (doctor._id.equals(currentUser._id)) {
      return res.status(403).json({
        error: 'Auto-avaliação não permitida',
        message: 'Você não pode se avaliar'
      });
    }

    const existingRating = await DoctorRating.findOne({
      doctorId: doctor._id,
      userId: currentUser._id
    });

    let ratingResult;
    
    if (existingRating) {
      existingRating.rating = Number(rating);
      existingRating.comment = comment || existingRating.comment;
      ratingResult = await existingRating.save();
    } else {
      ratingResult = await DoctorRating.create({
        doctorId: doctor._id,
        userId: currentUser._id,
        rating: Number(rating),
        comment: comment || undefined,
      });
    }

    const { averageRating, reviewsCount } = await DoctorRating.getAverageRating(doctor._id);

    return res.status(201).json({
      success: true,
      data: {
        ratingId: ratingResult._id,
        averageRating,
        reviewsCount,
        givenRating: rating,
        comment: ratingResult.comment,
        isUpdated: !!existingRating
      },
      message: existingRating 
        ? 'Avaliação atualizada com sucesso' 
        : 'Avaliação registrada com sucesso'
    });

  } catch (error) {
    console.error('Erro no processo de avaliação:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O formato do ID do médico é inválido'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Erro interno no servidor',
      message: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Ocorreu um erro ao processar sua avaliação'
    });
  }
};

export const fetchDoctorRating = async (req, res) => {
  const { doctorId } = req.params;

  try {
    const result = await DoctorRating.getAverageRating(doctorId);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar avaliações.' });
  }
};

export const fetchDoctorRatingsWithComments = async (req, res) => {
  const { doctorId } = req.params;
  const { limit = 10, skip = 0 } = req.query;

  try {
    const ratings = await DoctorRating.find({ doctorId })
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .select('rating comment createdAt');

    const { averageRating, reviewsCount } = await DoctorRating.getAverageRating(doctorId);

    res.json({
      data: {
        ratings,
        averageRating,
        reviewsCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar avaliações.' });
  }
};