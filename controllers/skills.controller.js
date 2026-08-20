import SkillCategory from "../models/SkillCategory.js"

export const getSkillCategories = async (req, res) => {
  try {
    const categories = await SkillCategory.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};