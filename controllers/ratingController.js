import DoctorRating from '../models/DoctorRating';

export const submitDoctorRating = async (req, res) => {
  const { doctorId } = req.params;
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Nota inválida. Deve estar entre 1 e 5.' });
  }

  let docRating = await DoctorRating.findOne({ doctorId });

  if (!docRating) {
    docRating = new DoctorRating({ doctorId, ratings: [rating] });
  } else {
    docRating.ratings.push(rating);
  }

  await docRating.save();

  const averageRating = docRating.ratings.reduce((a, b) => a + b, 0) / docRating.ratings.length;
  const reviewsCount = docRating.ratings.length;

  res.json({ data: { averageRating, reviewsCount } });
};

export const fetchDoctorRating = async (req, res) => {
  const { doctorId } = req.params;

  const docRating = await DoctorRating.findOne({ doctorId });

  if (!docRating) {
    return res.json({ data: { averageRating: 0, reviewsCount: 0 } });
  }

  const averageRating = docRating.ratings.reduce((a, b) => a + b, 0) / docRating.ratings.length;
  const reviewsCount = docRating.ratings.length;

  res.json({ data: { averageRating, reviewsCount } });
};
