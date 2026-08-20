import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret_key';

export const protect = (req, res, next) => {
  if (process.env.ENABLE_DEV_AUTH_BYPASS === 'true') {
    req.user = { id: '6a8426fedeb52eb769292cbe' }; //run seedUser.js to generate a user ID
    return next();
  }

  let token;

  // 1. Check for token in Authorization header (Format: "Bearer <token>")
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. If no token found, deny access immediately
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, access token missing' });
  }

  try {
    // 3. Verify access token signature and expiration
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

    // 4. Attach decoded payload (user ID) to request object
    req.user = { id: decoded.id };

    // 5. Pass control to the next middleware/controller
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
};