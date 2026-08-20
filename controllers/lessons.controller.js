import Lesson from '../models/Lessons.js'; // Adjust path as needed

export const createLesson = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dateKey, slot, unitName, time, venue, lecturer, repeat, sourceDate } = req.body;

    // 1. Validation for required fields
    if (!dateKey || slot === undefined || !unitName) {
      return res.status(400).json({
        message: 'Missing required fields: dateKey, slot, and unitName are required.',
      });
    }

    // 1.5. Check for repeating lesson clashes
    const incomingDate = new Date(dateKey);
    const incomingDay = incomingDate.getDay();

    const existingRepeatingLessons = await Lesson.find({
      user: userId,
      slot: Number(slot),
      repeat: { $in: ['weekly', 'bi-weekly'] }
    });

    for (const existing of existingRepeatingLessons) {
      const existingDate = new Date(existing.dateKey);

      // Check if they fall on the same day of the week
      if (existingDate.getDay() === incomingDay) {
        
        // If incoming is also repeating, they will likely clash infinitely
        if (['weekly', 'bi-weekly'].includes(repeat)) {
          if (repeat === 'bi-weekly' && existing.repeat === 'bi-weekly') {
            const diffTime = Math.abs(incomingDate.getTime() - existingDate.getTime());
            const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
            if (diffWeeks % 2 === 0) {
              return res.status(409).json({
                message: `Cannot create repeating lesson: Slot ${slot} is already covered by a bi-weekly lesson (${existing.unitName}).`
              });
            }
          } else {
            // At least one is weekly, so they definitely clash
            return res.status(409).json({
              message: `Cannot create repeating lesson: Slot ${slot} is already covered by a repeating lesson (${existing.unitName}).`
            });
          }
        } 
        
        // If incoming is a one-off ('never'), check if the existing repeating lesson covers this exact date
        if (repeat === 'never' || !repeat) {
          if (existingDate <= incomingDate) {
            if (existing.repeat === 'weekly') {
              return res.status(409).json({
                message: `Slot ${slot} on this date is covered by a weekly lesson (${existing.unitName}).`
              });
            } else if (existing.repeat === 'bi-weekly') {
              const diffTime = Math.abs(incomingDate.getTime() - existingDate.getTime());
              const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
              if (diffWeeks % 2 === 0) {
                return res.status(409).json({
                  message: `Slot ${slot} on this date is covered by a bi-weekly lesson (${existing.unitName}).`
                });
              }
            }
          }
        }
      }
    }

    // 2. Create and save lesson record
    const lesson = await Lesson.create({
      user: userId,
      dateKey,
      slot,
      unitName,
      time,
      venue,
      lecturer,
      repeat,
      sourceDate,
    });

    return res.status(201).json({
      message: 'Lesson added successfully',
      lesson,
    });
  } catch (error) {
    // Handle MongoDB duplicate key error (code 11000) for compound index
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'A lesson already exists for this slot on the specified date.',
      });
    }

    return res.status(500).json({
      message: 'Failed to create lesson',
      error: error.message,
    });
  }
};

export const getLessons = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dateKey, startDate, endDate, unitName, slot, repeat } = req.query;

    // 1. Base query bound to authenticated user
    const query = { user: userId };

    // 2. Date Filtering (exact date OR date range)
    if (dateKey) {
      query.dateKey = dateKey;
    } else if (startDate || endDate) {
      query.dateKey = {};
      if (startDate) query.dateKey.$gte = startDate;
      if (endDate) query.dateKey.$lte = endDate;
    }

    // 3. Optional Filters
    if (unitName) {
      query.unitName = { $regex: unitName, $options: 'i' }; // Partial match (case-insensitive)
    }

    if (slot !== undefined) {
      query.slot = Number(slot);
    }

    if (repeat) {
      query.repeat = repeat;
    }

    // 4. Fetch sorted by date and slot
    const lessons = await Lesson.find(query).sort({ dateKey: 1, slot: 1 });

    return res.status(200).json({
      count: lessons.length,
      lessons,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error fetching lessons',
      error: error.message,
    });
  }
};