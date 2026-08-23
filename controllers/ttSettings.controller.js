import TTSettings from '../models/TTSettings.js';

// GET: Retrieve user settings
export const getTTSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: user ID is missing' });
    }

    const settings = await TTSettings.findOne({ user: userId });
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Error getting settings', error: err.message });
  }
};

// POST / PATCH: Upsert settings safely
export const updateTTSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: user ID is missing' });
    }

    // Whitelist allowed fields to prevent arbitrary body updates
    const { 
      maxLessons, 
      lessonDuration, 
      firstLessonStartTime, 
      notificationsEnabled, 
      alertLeadTime 
    } = req.body;

    const updateData = {};
    if (maxLessons !== undefined) updateData.maxLessons = maxLessons;
    if (lessonDuration !== undefined) updateData.lessonDuration = lessonDuration;
    if (firstLessonStartTime !== undefined) updateData.firstLessonStartTime = firstLessonStartTime;
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;
    if (alertLeadTime !== undefined) updateData.alertLeadTime = alertLeadTime;

    const settings = await TTSettings.findOneAndUpdate(
      { user: userId },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Error updating settings', error: err.message });
  }
};

// DELETE: Reset settings
export const resetTTSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: user ID is missing' });
    }

    const settings = await TTSettings.findOneAndDelete({ user: userId });
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    res.json({ message: 'Settings reset successfully', settings });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting settings', error: err.message });
  }
};