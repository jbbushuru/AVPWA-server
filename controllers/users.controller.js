import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/Users.js';
import { sanitizeString } from '../utils/sanitizeString.js';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

// Helper: Generate short-lived Access Token
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
};

// Helper: Generate long-lived Refresh Token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

// Helper: Attach Refresh Token to secure HTTP-only Cookie
const sendRefreshTokenCookie = (res, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, // Guards against XSS attacks
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'lax' : 'lax', 
    domain: isProduction ? '.mayvenprod.com' : undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * @desc    Register user & issue token pair
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const sanitizedEmail = sanitizeString(email);

    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: sanitizedEmail,
      password: hashedPassword,
    });

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    sendRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
      message: 'Account created successfully',
      userId: user._id,
      accessToken,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Login & issue token pair
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const sanitizedEmail = sanitizeString(email);

    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    sendRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      message: 'Login successful',
      userId: user._id,
      accessToken,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get new access token using HTTP-only Refresh Token cookie
 * @route   POST /api/auth/refresh-token
 * @access  Public (Requires Refresh Token Cookie)
 */
export const refreshToken = async (req, res) => {
  try {
    // 1. Get token from cookies
    const cookies = req.cookies;
    if (!cookies?.refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    const refreshToken = cookies.refreshToken;

    // 2. Verify token
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) {
          return res.status(403).json({ message: 'Invalid or expired refresh token' });
        }

        // 3. Issue new access token
        const accessToken = jwt.sign(
          { id: decoded.id },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '15m' }
        );

        return res.status(200).json({ accessToken });
      }
    );
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

/**
 * @desc    Logout user & clear refresh token cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logout = async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'lax' : 'lax', 
    domain: isProduction ? '.mayvenprod.com' : undefined,
  });
  return res.status(200).json({ message: 'Logged out successfully' });
};