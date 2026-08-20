import { Schema, model } from 'mongoose';

const ttSettingsSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  maxLessons: { type: Number, default: 5 },
  lessonDuration: { type: Number, default: 90 },
  firstLessonStartTime: { type: Number, default: 8 },
  hasOnboarded: { type: Boolean, default: false },
  notificationsEnabled: { type: Boolean, default: true },
  alertLeadTime: { type: Number, default: 15 },
},{timestamps:true});

export default model('TTSettings', ttSettingsSchema);
