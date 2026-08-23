import express from 'express';
import { getTTSettings, updateTTSettings, resetTTSettings } from '../controllers/ttSettings.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/settings')
  .get(getTTSettings)
  .post(updateTTSettings)
  .patch(updateTTSettings)
  .delete(resetTTSettings);

export default router;