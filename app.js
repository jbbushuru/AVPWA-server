import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import authRoutes from './routes/users.routes.js';
import profileRoutes from './routes/profiles.routes.js';
import unitRoutes from './routes/units.routes.js';
import lessonRoutes from './routes/lessons.routes.js';
import timetableRoutes from './routes/timetable.routes.js';


const app = express();
app.set('trust proxy', 1);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  mongoSanitize.sanitize(req.body);
  mongoSanitize.sanitize(req.params);
  next();
});

// 1. Root route
app.get('/', (req, res) => {
  res.send("Academic Vault Backend running...");
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/timetable', timetableRoutes);

// 3. Error Handling Middleware (MUST stay at the bottom)
app.use(notFound);
app.use(errorHandler);

export default app;