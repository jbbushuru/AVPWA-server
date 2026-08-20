import express from 'express';
import { register, login, refreshToken, logout } from '../controllers/users.controller.js';

const router = express.Router();

// Public Routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

export default router;