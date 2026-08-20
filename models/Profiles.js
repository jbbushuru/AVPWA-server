import { Schema, model } from 'mongoose';

const profileSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  course: { type: String, required: true },
  courseDuration: { type: Number, required: true },
  academicSystem: { 
    type: String, 
    enum: ['Semester', 'Trimester'],
    required: true 
  },
  year: { type: Number, required: true },
  term: { type: Number, required: true },
  target: { type: Number, default: null },
  studyReminders: { type: Boolean, default: true },
  assignmentAlerts: { type: Boolean, default: true }
});

export default model('Profile', profileSchema);