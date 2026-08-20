import express from 'express';
import {
  createUnit,
  updateUnit,
  getAllUnits,
  getUnitById,
  retakeUnit,
  deleteUnit,
  getUnitsSummary,
} from '../controllers/units.controller.js';
import { getSkillCategories } from '../controllers/skills.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAllUnits)   // GET /api/units?year=4&term=1
  .post(createUnit);  // POST /api/units

router.get('/summary',protect, getUnitsSummary);
router.get('/categories', getSkillCategories);

router.post('/retake', retakeUnit); // POST /api/units/retake

router.route('/:id')
  .get(getUnitById)    // GET /api/units/:id
  .put(updateUnit)     // PUT /api/units/:id
  .delete(deleteUnit); // DELETE /api/units/:id

export default router;
