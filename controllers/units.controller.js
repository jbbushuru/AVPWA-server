import Unit from '../models/units.js';
import mongoose from 'mongoose';
import { getGradeFromPoints } from '../utils/getGradeFromPoints.js';

// Helper: Maps letter grades to points on the server
const calculatePointsFromGrade = (grade) => {
  if (!grade || typeof grade !== 'string') return 0;
  const scale = { A: 12, B: 9, C: 6, D: 3, F: 0 };
  return scale[grade.toUpperCase().trim()] ?? 0;
};

// 1. CREATE UNIT (supports single object or batch array via `units` field)
export const createUnit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, term, units } = req.body;

    // 1. BATCH submission (array of units from modal)
    if (Array.isArray(units)) {
      if (units.length === 0) {
        return res.status(400).json({ message: 'At least one unit must be provided.' });
      }

      // Format codes and extract list of submitted codes
      const formattedUnits = units.map((u) => ({
        ...u,
        code: u.code.toUpperCase().trim(),
      }));
      const unitCodes = formattedUnits.map((u) => u.code);

      // GUARD: Check if any of these unit codes ALREADY exist for this user
      const existingUnits = await Unit.find({
        user: userId,
        code: { $in: unitCodes },
      });

      if (existingUnits.length > 0) {
        const duplicateCodes = existingUnits.map((u) => u.code).join(', ');
        return res.status(400).json({
          message: `The following unit(s) already exist: ${duplicateCodes}. Please use the retake option for existing units.`,
          isExisting: true,
          existingCodes: existingUnits.map((u) => u.code),
        });
      }

      // Map data with inherited top-level Year, Semester/Term, and calculated points
      const unitsToInsert = formattedUnits.map((u) => ({
        user: userId,
        year: Number(year),
        term: Number(term),
        code: u.code,
        name: u.name,
        grade: u.grade.toUpperCase().trim(),
        points: calculatePointsFromGrade(u.grade),
        category: u.category || null,
        retakeCounter: 0,
        isCounted: true,
      }));

      const createdUnits = await Unit.insertMany(unitsToInsert);
      return res.status(201).json({
        message: `Successfully created ${createdUnits.length} unit(s)`,
        units: createdUnits,
      });
    }

    // 2. Fallback: SINGLE UNIT submission
    const { code, name, grade, category } = req.body;
    const unitCode = code.toUpperCase().trim();

    const existingUnit = await Unit.findOne({ user: userId, code: unitCode });
    if (existingUnit) {
      return res.status(400).json({
        message: `Unit '${unitCode}' already exists. Use retake to log another attempt.`,
        isExisting: true,
      });
    }

    const newUnit = await Unit.create({
      user: userId,
      year: Number(year),
      term: Number(term),
      code: unitCode,
      name,
      grade: grade.toUpperCase().trim(),
      points: calculatePointsFromGrade(grade),
      category: category || null,
      retakeCounter: 0,
      isCounted: true,
    });

    return res.status(201).json(newUnit);
  } catch (error) {
    return res.status(500).json({ message: 'Error creating unit(s)', error: error.message });
  }
};

// 2. UPDATE UNIT
export const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, grade, category, year, term } = req.body;

    const unit = await Unit.findOne({ _id: id, user: req.user.id });
    if (!unit) return res.status(404).json({ message: 'Unit not found' });

    if (name) unit.name = name;
    if (category) unit.category = category;
    if (year) unit.year = Number(year);
    if (term) unit.term = Number(term);

    if (grade) {
      unit.grade = grade.toUpperCase().trim();
      unit.points = calculatePointsFromGrade(grade);
    }

    await unit.save();
    return res.status(200).json(unit);
  } catch (error) {
    return res.status(500).json({ message: 'Error updating unit', error: error.message });
  }
};

// 3. GET ALL UNITS (Handles filters like ?year=2&term=1&grade=A&isCounted=true)
export const getAllUnits = async (req, res) => {
  try {
    const { year, term, grade, category, isCounted } = req.query;

    // Base filter scoped to authenticated user
    const filter = { user: req.user.id };

    if (year) filter.year = Number(year);
    if (term) filter.term = Number(term);
    if (grade) filter.grade = grade.toUpperCase().trim();
    if (category) filter.category = category;
    if (isCounted !== undefined) filter.isCounted = isCounted === 'true';

    const units = await Unit.find(filter)
      .populate('category')
      .sort({ year: 1, term: 1, code: 1 });

    return res.status(200).json(units);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching units', error: error.message });
  }
};

// 4. GET ONE UNIT
export const getUnitById = async (req, res) => {
  try {
    const unit = await Unit.findOne({ _id: req.params.id, user: req.user.id }).populate('category');
    if (!unit) return res.status(404).json({ message: 'Unit not found' });

    return res.status(200).json(unit);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching unit', error: error.message });
  }
};

// 5. RETAKE UNIT (Only needs { code, grade })
export const retakeUnit = async (req, res) => {
  try {
    const { code, grade } = req.body;
    const userId = req.user.id;

    if (!code || !grade) {
      return res.status(400).json({ message: 'Both unit code and new grade are required.' });
    }

    const unitCode = code.toUpperCase().trim();

    const previousAttempt = await Unit.findOne({ user: userId, code: unitCode })
      .sort({ retakeCounter: -1 });

    if (!previousAttempt) {
      return res.status(404).json({
        message: `No existing unit found for '${unitCode}'. Create the initial unit first.`,
      });
    }

    await Unit.updateMany({ user: userId, code: unitCode }, { $set: { isCounted: false } });

    const retakenUnit = await Unit.create({
      user: userId,
      code: unitCode,
      name: previousAttempt.name,
      category: previousAttempt.category,
      year: Number(previousAttempt.year),
      term: Number(previousAttempt.term),
      grade: grade.toUpperCase().trim(),
      points: calculatePointsFromGrade(grade),
      retakeCounter: previousAttempt.retakeCounter + 1,
      isCounted: true,
    });

    return res.status(201).json(retakenUnit);
  } catch (error) {
    return res.status(500).json({ message: 'Error processing retake', error: error.message });
  }
};

// 6. DELETE UNIT
export const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const unitToDelete = await Unit.findOne({ _id: id, user: userId });
    if (!unitToDelete) return res.status(404).json({ message: 'Unit not found' });

    await unitToDelete.deleteOne();

    // If the deleted unit was active, reactivate the previous highest retake attempt
    if (unitToDelete.isCounted) {
      const remainingAttempt = await Unit.findOne({ user: userId, code: unitToDelete.code })
        .sort({ retakeCounter: -1 });

      if (remainingAttempt) {
        remainingAttempt.isCounted = true;
        await remainingAttempt.save();
      }
    }

    return res.status(200).json({ message: 'Unit deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting unit', error: error.message });
  }
};

export const getUnitsSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Unit.aggregate([
      // 1. Filter ALL records for the authenticated user
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
        },
      },
      // 2. Group by grade and count total occurrences + conditional retakes for Fs
      {
        $group: {
          _id: '$grade',
          totalCount: { $sum: 1 },
          retakenCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$grade', 'F'] },
                    { $eq: ['$isCounted', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      // 3. Reshape output: include retakenCount ONLY if grade is 'F'
      {
        $project: {
          _id: 0,
          grade: '$_id',
          totalCount: 1,
          retakenCount: {
            $cond: [{ $eq: ['$_id', 'F'] }, '$retakenCount', '$$REMOVE'],
          },
        },
      },
      // 4. Sort alphabetically (A, B, C, D, E, F...)
      {
        $sort: { grade: 1 },
      },
    ]);

const rawStrengths = await Unit.aggregate([
      // 1. Match user units
      { $match: { user: new mongoose.Types.ObjectId(userId) } },

      // 2. Populate / Join Category document
      {
        $lookup: {
          from: 'skillcategories', // Ensure this matches your MongoDB collection name for categories
          localField: 'category',
          foreignField: '_id',
          as: 'categoryDoc',
        },
      },
      {
        $unwind: {
          path: '$categoryDoc',
          preserveNullAndEmptyArrays: true, // In case category is null or unassigned
        },
      },

      // 3. Group by Year, Term, and Category Name -> calculate average points
      {
        $group: {
          _id: {
            year: '$year',
            term: '$term',
            category: { $ifNull: ['$categoryDoc.name', 'Uncategorized'] }, // Extract category name
            signatureColor: '$categoryDoc.signatureColor', // Extract signature color
          },
          avgPoints: { $avg: '$points' },
          units: {
            $push: { code: '$code', name: '$name', grade: '$grade' },
          },
        },
      },

      // 4. Group by Year and Term -> find maximum average score
      {
        $group: {
          _id: { year: '$_id.year', term: '$_id.term' },
          categories: {
            $push: {
              categoryName: '$_id.category',
              signatureColor: '$_id.signatureColor',
              avgPoints: '$avgPoints',
              units: '$units',
            },
          },
          maxAvg: { $max: '$avgPoints' },
        },
      },

      // 5. Filter to keep top category/categories
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          term: '$_id.term',
          topCategories: {
            $filter: {
              input: '$categories',
              as: 'cat',
              cond: { $eq: ['$$cat.avgPoints', '$maxAvg'] },
            },
          },
        },
      },

      // 6. Group by Year
      {
        $group: {
          _id: '$year',
          terms: {
            $push: {
              term: '$term',
              strengths: '$topCategories',
            },
          },
        },
      },

      { $project: { _id: 0, yr: '$_id', terms: 1 } },
      { $sort: { yr: 1 } },
    ]);

    // Post-processing mapping function for grades
    const strengths = rawStrengths.map((yearGroup) => ({
      ...yearGroup,
      terms: yearGroup.terms.map((termGroup) => ({
        ...termGroup,
        strengths: termGroup.strengths.map((cat) => ({
          categoryName: cat.categoryName,
          signatureColor: cat.signatureColor,
          averageGrade: getGradeFromPoints(cat.avgPoints),
          units: cat.units,
        })),
      })),
    }));

    return res.status(200).json({ stats, strengths });
  } catch (error) {
    return res.status(500).json({
      message: 'Error aggregating grade stats',
      error: error.message,
    });
  }
};