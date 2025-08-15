const jwt = require('jsonwebtoken');
const User = require('../models/User');
const util = require('util');

// Promisify JWT functions
const promisifiedJWTverify = util.promisify(jwt.verify);

// Protect routes - verify JWT token from cookies
const protect = async (req, res, next) => {
  try {
    // Check if JWT token exists in cookies
    if (req.cookies && req.cookies.jwt) {
      const authToken = req.cookies.jwt;
      
      // Verify token using promisified function
      const unlockedToken = await promisifiedJWTverify(authToken, process.env.JWT_SECRET);
      
      // Set user id in request
      req.user = { id: unlockedToken.id };

      // Load user document without password
      const user = await User.findById(unlockedToken.id).select('-password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Attach user document to request
      req.userDoc = user;

      next();
    } else {
      return res.status(401).json({
        success: false,
        message: 'No JWT token found in cookies'
      });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};

module.exports = { protect };
