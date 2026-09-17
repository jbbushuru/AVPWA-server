import { Router } from 'express';
import { protect} from '../middleware/authMiddleware.js';
import { createLesson, getLessons, deleteAllLessons, updateLesson, deleteLesson } from '../controllers/lessons.controller.js';

const router = Router();

router.post('/', protect, createLesson);
router.get('/', protect, getLessons);
router.delete('/', protect, deleteAllLessons);

router.patch('/:id', protect, updateLesson);
router.delete('/:id', protect, deleteLesson);

export default router;