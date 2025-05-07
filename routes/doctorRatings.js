const express = require('express');
const {
  getDoctorRating,
  submitDoctorRating
} = require('../controllers/doctorRatingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/:doctorId/rating')
  .get(protect, getDoctorRating)
  .post(protect, submitDoctorRating);

module.exports = router;