import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  completeTask,
  uncompleteTask,
  deleteTask,
} from '../controllers/tasks.controller.js';
import { protect } from '../middleware/authMiddleware.js'; // adjust to your existing auth middleware

const router = Router();

router.use(protect);

router.get('/', getTasks);
router.post('/', createTask);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.patch('/:id/complete', completeTask);
router.patch('/:id/uncomplete', uncompleteTask);
router.delete('/:id', deleteTask);

export default router;