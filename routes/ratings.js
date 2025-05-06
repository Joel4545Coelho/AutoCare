const express = require('express');
const router = express.Router();
const ratingsController = require('../controllers/ratingsController');
const authMiddleware = require('../middleware/auth'); // Assuming you have auth middleware

// Submit a rating for a doctor
router.post('/:doctorId/rating', authMiddleware, ratingsController.submitRating);

// Get a doctor's rating summary
router.get('/:doctorId/rating', ratingsController.getDoctorRating);

// Get all ratings for a doctor
router.get('/:doctorId/ratings', ratingsController.getDoctorRatings);

module.exports = router;