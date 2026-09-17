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

    // 1.5. Check for duplicate start time on the same dateKey (direct conflict)
    if (time) {
      const sameTimeSameDay = await Lesson.findOne({
        user: userId,
        dateKey,
        time,
      });

      if (sameTimeSameDay) {
        return res.status(409).json({
          message: `A lesson (${sameTimeSameDay.unitName}) already starts at ${time} on this date.`,
        });
      }
    }

    // 2. Check for repeating lesson clashes (by slot AND by start time)
    const incomingDate = new Date(dateKey);
    const incomingDay = incomingDate.getDay();

    // Find repeating lessons that share the same slot OR the same start time
    const existingRepeatingLessons = await Lesson.find({
      user: userId,
      repeat: { $in: ['weekly', 'bi-weekly'] },
      $or: [
        { slot: Number(slot) },
        ...(time ? [{ time }] : []),
      ],
    });

    for (const existing of existingRepeatingLessons) {
      const existingDate = new Date(existing.dateKey);

      // Check if they fall on the same day of the week
      if (existingDate.getDay() === incomingDay) {
        const conflictField = existing.slot === Number(slot)
          ? `slot ${slot}`
          : `start time ${time}`;

        // If incoming is also repeating, they will likely clash infinitely
        if (['weekly', 'bi-weekly'].includes(repeat)) {
          if (repeat === 'bi-weekly' && existing.repeat === 'bi-weekly') {
            const diffTime = Math.abs(incomingDate.getTime() - existingDate.getTime());
            const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
            if (diffWeeks % 2 === 0) {
              return res.status(409).json({
                message: `Cannot create repeating lesson: ${conflictField} is already covered by a bi-weekly lesson (${existing.unitName}).`,
              });
            }
          } else {
            // At least one is weekly, so they definitely clash
            return res.status(409).json({
              message: `Cannot create repeating lesson: ${conflictField} is already covered by a repeating lesson (${existing.unitName}).`,
            });
          }
        }

        // If incoming is a one-off ('never'), check if the existing repeating lesson covers this exact date
        if (repeat === 'never' || !repeat) {
          if (existingDate <= incomingDate) {
            if (existing.repeat === 'weekly') {
              return res.status(409).json({
                message: `${conflictField} on this date is covered by a weekly lesson (${existing.unitName}).`,
              });
            } else if (existing.repeat === 'bi-weekly') {
              const diffTime = Math.abs(incomingDate.getTime() - existingDate.getTime());
              const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
              if (diffWeeks % 2 === 0) {
                return res.status(409).json({
                  message: `${conflictField} on this date is covered by a bi-weekly lesson (${existing.unitName}).`,
                });
              }
            }
          }
        }
      }
    }

    // 3. Create and save lesson record
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

export const deleteAllLessons = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Lesson.deleteMany({ user: userId });

    return res.status(200).json({
      message: 'All lessons deleted successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete lessons',
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

export const updateLesson = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { dateKey, slot, unitName, time, venue, lecturer, repeat, sourceDate } = req.body;

    // 1. Find the lesson and confirm ownership
    const existingLesson = await Lesson.findOne({ _id: id, user: userId });

    if (!existingLesson) {
      return res.status(404).json({
        message: 'Lesson not found',
      });
    }

    // 2. Merge incoming fields with existing values (partial update support)
    const updatedDateKey = dateKey !== undefined ? dateKey : existingLesson.dateKey;
    const updatedSlot = slot !== undefined ? slot : existingLesson.slot;
    const updatedTime = time !== undefined ? time : existingLesson.time;
    const updatedRepeat = repeat !== undefined ? repeat : existingLesson.repeat;

    // 3. Check for duplicate start time on the same dateKey (direct conflict), excluding self
    if (updatedTime) {
      const sameTimeSameDay = await Lesson.findOne({
        _id: { $ne: id },
        user: userId,
        dateKey: updatedDateKey,
        time: updatedTime,
      });

      if (sameTimeSameDay) {
        return res.status(409).json({
          message: `A lesson (${sameTimeSameDay.unitName}) already starts at ${updatedTime} on this date.`,
        });
      }
    }

    // 4. Check for repeating lesson clashes (by slot AND by start time), excluding self
    const incomingDate = new Date(updatedDateKey);
    const incomingDay = incomingDate.getDay();

    const existingRepeatingLessons = await Lesson.find({
      _id: { $ne: id },
      user: userId,
      repeat: { $in: ['weekly', 'bi-weekly'] },
      $or: [
        { slot: Number(updatedSlot) },
        ...(updatedTime ? [{ time: updatedTime }] : []),
      ],
    });

    for (const existing of existingRepeatingLessons) {
      const existingDate = new Date(existing.dateKey);

      if (existingDate.getDay() === incomingDay) {
        const conflictField = existing.slot === Number(updatedSlot)
          ? `slot ${updatedSlot}`
          : `start time ${updatedTime}`;

        if (['weekly', 'bi-weekly'].includes(updatedRepeat)) {
          if (updatedRepeat === 'bi-weekly' && existing.repeat === 'bi-weekly') {
            const diffTime = Math.abs(incomingDate.getTime() - existingDate.getTime());
            const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
            if (diffWeeks % 2 === 0) {
              return res.status(409).json({
                message: `Cannot update lesson: ${conflictField} is already covered by a bi-weekly lesson (${existing.unitName}).`,
              });
            }
          } else {
            return res.status(409).json({
              message: `Cannot update lesson: ${conflictField} is already covered by a repeating lesson (${existing.unitName}).`,
            });
          }
        }

        if (updatedRepeat === 'never' || !updatedRepeat) {
          if (existingDate <= incomingDate) {
            if (existing.repeat === 'weekly') {
              return res.status(409).json({
                message: `${conflictField} on this date is covered by a weekly lesson (${existing.unitName}).`,
              });
            } else if (existing.repeat === 'bi-weekly') {
              const diffTime = Math.abs(incomingDate.getTime() - existingDate.getTime());
              const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
              if (diffWeeks % 2 === 0) {
                return res.status(409).json({
                  message: `${conflictField} on this date is covered by a bi-weekly lesson (${existing.unitName}).`,
                });
              }
            }
          }
        }
      }
    }

    // 5. Apply updates
    existingLesson.dateKey = updatedDateKey;
    existingLesson.slot = updatedSlot;
    existingLesson.unitName = unitName !== undefined ? unitName : existingLesson.unitName;
    existingLesson.time = updatedTime;
    existingLesson.venue = venue !== undefined ? venue : existingLesson.venue;
    existingLesson.lecturer = lecturer !== undefined ? lecturer : existingLesson.lecturer;
    existingLesson.repeat = updatedRepeat;
    existingLesson.sourceDate = sourceDate !== undefined ? sourceDate : existingLesson.sourceDate;

    const savedLesson = await existingLesson.save();

    return res.status(200).json({
      message: 'Lesson updated successfully',
      lesson: savedLesson,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'A lesson already exists for this slot on the specified date.',
      });
    }

    return res.status(500).json({
      message: 'Failed to update lesson',
      error: error.message,
    });
  }
};

export const deleteLesson = async (req,res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const lesson = await Lesson.findOne({ _id: id, user: userId });

    if (!lesson) {
      return res.status(404).json({
        message: 'Lesson not found',
      });
    }

    await lesson.deleteOne();

    return res.status(200).json({
      message: 'Lesson deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete lesson',
      error: error.message,
    });
  }

}