import express from 'express';
import { submitDoctorRating, fetchDoctorRating } from '../controllers/ratingController';

const router = express.Router();

router.post('/api/v1/doctors/:doctorId/rating', submitDoctorRating);
router.get('/api/v1/doctors/:doctorId/rating', fetchDoctorRating);

export default router;
