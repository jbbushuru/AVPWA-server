import { Schema, model } from 'mongoose';

const unitSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    grade: { type: String, required: true, trim: true, uppercase: true },
    points: { type: Number, required: true, min: 0 },
    year: { type: Number, required: true },
    term: { type: Number, required: true },
    category: { type: Schema.Types.ObjectId, ref: 'SkillCategory' },

    // RETAKE COUNTER & ACTIVE FLAG
    retakeCounter: { type: Number, default: 0 }, // 0 = original attempt, 1 = first retake, 2 = second retake...
    isCounted: { type: Boolean, default: true },   // false for historical failed attempts
  },
  { timestamps: true }
);

unitSchema.index({ user: 1, code: 1 });
export default model('Unit', unitSchema);