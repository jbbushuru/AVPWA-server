// Task {
//   _id: ObjectId,
//   userId: ObjectId,
//   title: String,
//   description: String,
//   lessonId: ObjectId | null,
//   priority: 'low' | 'medium' | 'high',
//   status: 'To-do' | 'In-progress' | 'Done',
//   dueDate: Date | null,
//   recurrence: {
//     enabled: Boolean,
//     frequency: 'daily' | 'weekly' | 'monthly',
//     interval: Number
//   } | null,
//   createdAt: Date,
//   updatedAt: Date
// }

import mongoose from 'mongoose';

const { Schema } = mongoose;

const recurrenceSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
    },
    interval: { type: Number, min: 1, default: 1 },
  },
  { _id: false }
);

const taskSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      default: null,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['To-do', 'In-progress', 'Done'],
      default: 'To-do',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    recurrence: {
      type: recurrenceSchema,
      default: () => ({ enabled: false }),
    },
    spawnedFrom: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
  },
  { timestamps: true }
);

// Common query patterns: a user's tasks filtered by status/priority/due date
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });

export default mongoose.model('Task', taskSchema);