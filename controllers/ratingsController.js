const Rating = require('../models/Rating');
const Doctor = require('../models/Doctor');

// Submit a rating for a doctor
exports.submitRating = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id; // Assuming you have authentication middleware

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Check if user already rated this doctor
    const existingRating = await Rating.findOne({ doctor: doctorId, user: userId });
    if (existingRating) {
      return res.status(400).json({ error: 'You have already rated this doctor' });
    }

    // Create new rating
    const newRating = new Rating({
      doctor: doctorId,
      user: userId,
      rating,
      comment,
    });

    await newRating.save();

    // Update doctor's average rating
    const allRatings = await Rating.find({ doctor: doctorId });
    const totalRatings = allRatings.length;
    const sumRatings = allRatings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = sumRatings / totalRatings;

    doctor.averageRating = averageRating;
    doctor.ratingsCount = totalRatings;
    await doctor.save();

    res.status(201).json({
      message: 'Rating submitted successfully',
      rating: newRating,
      doctor: {
        averageRating: doctor.averageRating,
        ratingsCount: doctor.ratingsCount,
      },
    });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
};

// Get a doctor's rating information
exports.getDoctorRating = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json({
      averageRating: doctor.averageRating,
      reviewsCount: doctor.ratingsCount,
    });
  } catch (error) {
    console.error('Error fetching doctor rating:', error);
    res.status(500).json({ error: 'Failed to fetch doctor rating' });
  }
};

// Get all ratings for a doctor (with optional pagination)
exports.getDoctorRatings = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const ratings = await Rating.find({ doctor: doctorId })
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalRatings = await Rating.countDocuments({ doctor: doctorId });

    res.json({
      ratings,
      totalRatings,
      currentPage: page,
      totalPages: Math.ceil(totalRatings / limit),
    });
  } catch (error) {
    console.error('Error fetching doctor ratings:', error);
    res.status(500).json({ error: 'Failed to fetch doctor ratings' });
  }
};