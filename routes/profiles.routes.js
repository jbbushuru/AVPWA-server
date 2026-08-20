import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getMyProfile,
  createProfile,
  updateProfile,
} from '../controllers/profiles.controller.js';


const router = express.Router();

// GET /api/profile/me — full profile for auth context hydration and prefilling the edit profile page
router.get('/me', protect, getMyProfile);

// POST /api/profile — create initial profile during onboarding
router.post('/', protect, createProfile);

// PATCH /api/profile — update profile details or preferences
router.patch('/', protect, updateProfile);

export default router;
