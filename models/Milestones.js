import { Schema, model } from 'mongoose';

const milestoneSchema = new Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['medal', 'shield', 'zap', 'award'], required: true },

}, { timestamps: true });

export default model('Milestone', milestoneSchema);
