import dotenv from 'dotenv';
dotenv.config(); // Loaded once globally

import app from './app.js';
import connectDB from './config/db.js';

if (process.env.MONGO_URI) {
  connectDB();
} else {
  console.warn('⚠️ MongoDB URI not set – skipping database connection.');
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});