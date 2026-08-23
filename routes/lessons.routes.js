import { Router } from 'express';
import { protect} from '../middleware/authMiddleware.js';
import { createLesson, getLessons, deleteAllLessons } from '../controllers/lessons.controller.js';

const router = Router();

router.post('/', protect, createLesson);
router.get('/', protect, getLessons);
router.delete('/', protect, deleteAllLessons);

export default router;