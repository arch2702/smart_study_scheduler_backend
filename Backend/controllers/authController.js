const User = require('../models/User');
const jwt = require('jsonwebtoken');
const util = require('util');

// Promisify JWT functions
const promisifiedJWTsign = util.promisify(jwt.sign);

// Generate JWT Token
const generateToken = async (id) => {
  return await promisifiedJWTsign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password
    });

    // Generate token
    const token = await generateToken(user._id);

    // Set JWT token in cookie
    res.cookie('jwt', token, {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true, // Only accessible by server
      // secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      secure: true,
      // sameSite: 'None'  
      // sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'  
    });

    // Send response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        points: user.points,
        theme: user.theme,
        rewardHistory: user.rewardHistory || []
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = await generateToken(user._id);


    
    // Set JWT token in cookie
      res.cookie('jwt', token, {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true, // Only accessible by server
      // secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      secure: true,
      // sameSite: 'None'  
      // sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
    });

    // Send response
    res.json({
      success: true,
      message: 'User logged in successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        points: user.points,
        theme: user.theme,
        rewardHistory: user.rewardHistory || []
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        points: user.points,
        theme: user.theme,
        rewardHistory: user.rewardHistory || []
      }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user data'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Clear JWT cookie with same options as set
    res.clearCookie('jwt', {
      maxAge :0,
      httpOnly: true,
      secure: true,
      // secure: process.env.NODE_ENV === 'production',
      // sameSite: 'None',
      // sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      // path: '/',
      // domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined
    });

    res.json({
      success: true,
      message: 'User logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout
};
