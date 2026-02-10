import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const setupSocket = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.name} (${socket.user.role})`);

    // Join role-specific rooms
    socket.join(`role:${socket.user.role}`);
    socket.join(`user:${socket.user._id}`);

    // Join doctor queue room when viewing
    socket.on('joinDoctorQueue', (doctorId) => {
      socket.join(`doctor:${doctorId}`);
    });

    socket.on('leaveDoctorQueue', (doctorId) => {
      socket.leave(`doctor:${doctorId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.name}`);
    });
  });

  return io;
};

export default setupSocket;
