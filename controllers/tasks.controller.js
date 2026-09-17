// GET    /api/tasks              # filters: status, priority, dueBefore, lessonId
// POST   /api/tasks              # optional lessonId when created from a lesson
// GET    /api/tasks/:id
// PUT    /api/tasks/:id
// PATCH  /api/tasks/:id/complete # marks done, spawns next occurrence if recurring
// DELETE /api/tasks/:id

import Task from '../models/Task.js';

const getNextDueDate = (dueDate, recurrence) => {
  const next = new Date(dueDate);
  const { frequency, interval } = recurrence;

  if (frequency === 'daily') next.setDate(next.getDate() + interval);
  if (frequency === 'weekly') next.setDate(next.getDate() + interval * 7);
  if (frequency === 'monthly') next.setMonth(next.getMonth() + interval);

  return next;
};

export const createTask = async (req, res) => {
  try {
    const { title, description, lessonId, priority, dueDate, recurrence } = req.body;

    const task = await Task.create({
      userId: req.user.id,
      title,
      description,
      lessonId: lessonId || null,
      priority,
      dueDate,
      recurrence,
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getTasks = async (req, res) => {
  try {
    const { status, priority, dueBefore, lessonId } = req.query;

    const filter = { userId: req.user.id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (lessonId) filter.lessonId = lessonId;
    if (dueBefore) filter.dueDate = { $lte: new Date(dueBefore) };

    const tasks = await Task.find(filter)
      .populate('lessonId', 'subject name')
      .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('lessonId', 'subject name');

    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    if (req.body.status === 'done') {
      return res.status(400).json({
        message: 'Use PATCH /api/tasks/:id/complete to mark a task done',
      });
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const completeTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.status = 'Done';

    // Spawn next occurrence if recurring
    if (task.recurrence?.enabled && task.dueDate) {
      const nextDueDate = getNextDueDate(task.dueDate, task.recurrence);

      await Task.create({
        userId: task.userId,
        title: task.title,
        description: task.description,
        lessonId: task.lessonId,
        priority: task.priority,
        status: 'To-do',
        dueDate: nextDueDate,
        recurrence: task.recurrence,
      });
    }

    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const uncompleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (task.status !== 'Done') {
      return res.status(400).json({ message: 'Task is not marked done' });
    }

    // If completing this task spawned a next occurrence, remove it
    // (only if that occurrence hasn't been touched yet, to avoid destroying user work)
    await Task.deleteOne({
      spawnedFrom: task._id,
      status: 'To-do',
    });

    task.status = 'To-do'; // or 'In-progress', see below
    await task.save();

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};