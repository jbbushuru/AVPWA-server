import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { seedCategories } from '../utils/seedCategories.js';


const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
            .then(() => {
                console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
                seedCategories(); // Seed foundational categories
            })
            .catch((err) => console.error('❌ Connection Error:', err));
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }
};

export default connectDB;