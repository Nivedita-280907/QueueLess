import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    let userRole = 'patient';
    let userStatus = 'active';

    // Doctor Registration Logic
    if (role === 'doctor') {
       if (!email.toLowerCase().endsWith('@hospital.com')) {
          return res.status(400).json({
             success: false, 
             message: 'Doctor email must end with @hospital.com'
          });
       }
       if (!department) {
           return res.status(400).json({
             success: false, 
             message: 'Department is required for doctors'
          });
       }
       userRole = 'doctor';
       userStatus = 'pending';
    }

    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      status: userStatus
    });

    if (userRole === 'doctor') {
       await Doctor.create({
          name: user.name,
          department,
          userId: user._id,
          isActive: false
       });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: userStatus === 'pending' ? 'Registration pending approval' : 'Registration successful',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        },
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval by administrator.'
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your account application has been rejected.'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

export const getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      data: { user: req.user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user info'
    });
  }
};

export const createStaffOrAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!['staff', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be staff or admin'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const user = await User.create({ name, email, password, role });

    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Create staff/admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create account'
    });
  }
};
