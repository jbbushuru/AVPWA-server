import { Schema, model } from 'mongoose';

const ttSettingsSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  maxLessons: { type: Number, default: 5 },
  lessonDuration: { type: Number, default: 2 },
  firstLessonStartTime: { type: String, default: '08:00 AM' },
  notificationsEnabled: { type: Boolean, default: true },
  alertLeadTime: { type: Number, default: 30 },
},{timestamps:true});

export default model('TTSettings', ttSettingsSchema);
