import express from 'express';
import { 
  submitDoctorRating, 
  fetchDoctorRating,
  fetchDoctorRatingsWithComments 
} from '../controllers/ratingController.js';
import authenticate from '../middlewares/IsAuth.js';

const router = express.Router();

router.post('/api/v1/doctors/:doctorId/rating', authenticate, submitDoctorRating);
router.get('/api/v1/doctors/:doctorId/rating', fetchDoctorRating);
router.get('/api/v1/doctors/:doctorId/ratings', fetchDoctorRatingsWithComments);

export default router;