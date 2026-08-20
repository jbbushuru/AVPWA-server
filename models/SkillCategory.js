import mongoose, { Schema, model } from 'mongoose';

const skillCategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  signatureColor: { type: String },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// A virtual to easily find all units belonging to this category across all users
skillCategorySchema.virtual('units', {
  ref: 'Unit',
  localField: '_id',
  foreignField: 'category'
});

export default mongoose.models.SkillCategory || model('SkillCategory', skillCategorySchema);
