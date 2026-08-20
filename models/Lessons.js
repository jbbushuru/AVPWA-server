import { Schema, model } from 'mongoose';

const lessonSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  dateKey: { type: String, required: true }, // 'YYYY-MM-DD'
  slot: { type: Number, required: true },
  unitName: { type: String, required: true }, // '__HIDDEN__' is used for overrides
  time: { type: String },
  venue: { type: String },
  lecturer: { type: String },
  repeat: { type: String, enum: ['never', 'weekly', 'bi-weekly'], default: 'never' },
  sourceDate: { type: String }, // For repeating instances pointing to original dateKey
}, { timestamps: true });

// Compound index to ensure unique lessons per slot per day for a user
lessonSchema.index({ user: 1, dateKey: 1, slot: 1 }, { unique: true });

export default model('Lesson', lessonSchema);
