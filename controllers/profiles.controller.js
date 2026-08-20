import Profile from '../models/Profiles.js';
import { sanitizeString } from '../utils/sanitizeString.js';

/**
 * @desc    Get the full profile of the logged-in user (used to prefill the edit profile page)
 * @route   GET /api/profile/me
 * @access  Private
 */
export const getMyProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate('user', 'email');

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    return res.status(200).json({
      email: profile.user?.email || null,
      firstName: profile.firstName,
      lastName: profile.lastName,
      course: profile.course,
      courseDuration: profile.courseDuration,
      academicSystem: profile.academicSystem,
      year: profile.year,
      term: profile.term,
      target: profile.target,
      studyReminders: profile.studyReminders,
      assignmentAlerts: profile.assignmentAlerts,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Create initial profile
 * @route   POST /api/profile
 * @access  Private
 */
export const createProfile = async (req, res) => {
  try {
    const existingProfile = await Profile.findOne({ user: req.user.id });
    if (existingProfile) {
      return res.status(400).json({ message: 'Profile already exists. Use PATCH to update.' });
    }

    const {
      firstName,
      lastName,
      course,
      courseDuration,
      academicSystem,
      year,
      term,
    } = req.body;

    if (!firstName || !lastName || !course || !courseDuration || !academicSystem || !year || !term) {
      return res.status(400).json({
        message: 'Please provide all required fields: firstName, lastName, course, courseDuration, academicSystem, year, term',
      });
    }

    const profile = await Profile.create({
      user: req.user.id,
      firstName: sanitizeString(firstName),
      lastName: sanitizeString(lastName),
      course: sanitizeString(course),
      courseDuration: Number(courseDuration),
      academicSystem: sanitizeString(academicSystem),
      year: Number(year),
      term: Number(term),
    });

    return res.status(201).json(profile);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update profile details / preferences (Partial update)
 * @route   PATCH /api/profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      course,
      courseDuration,
      academicSystem,
      year,
      term,
      target,
      studyReminders,
      assignmentAlerts,
    } = req.body;

    const profileFields = {};

    if (firstName !== undefined) profileFields.firstName = sanitizeString(firstName);
    if (lastName !== undefined) profileFields.lastName = sanitizeString(lastName);
    if (course !== undefined) profileFields.course = sanitizeString(course);
    if (courseDuration !== undefined) profileFields.courseDuration = Number(courseDuration);
    if (academicSystem !== undefined) profileFields.academicSystem = sanitizeString(academicSystem);
    if (year !== undefined) profileFields.year = Number(year);
    if (term !== undefined) profileFields.term = Number(term);
    if (target !== undefined) profileFields.target = target !== null ? Number(target) : null;
    if (studyReminders !== undefined) profileFields.studyReminders = Boolean(studyReminders);
    if (assignmentAlerts !== undefined) profileFields.assignmentAlerts = Boolean(assignmentAlerts);

    const profile = await Profile.findOneAndUpdate(
      { user: req.user.id },
      { $set: profileFields },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    return res.status(200).json(profile);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};