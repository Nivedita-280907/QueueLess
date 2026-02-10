import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Doctor from './models/Doctor.js';
import EmergencyStatus from './models/EmergencyStatus.js';

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Doctor.deleteMany({});
    await EmergencyStatus.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@queueless.com',
      password: 'admin123',
      role: 'admin'
    });
    console.log('✅ Admin created: admin@queueless.com / admin123');

    // Create staff user
    const staff = await User.create({
      name: 'Reception Staff',
      email: 'staff@queueless.com',
      password: 'staff123',
      role: 'staff'
    });
    console.log('✅ Staff created: staff@queueless.com / staff123');

    // Create patient users
    const patient1 = await User.create({
      name: 'Rahul Sharma',
      email: 'patient1@test.com',
      password: 'patient123',
      role: 'patient'
    });

    const patient2 = await User.create({
      name: 'Priya Patel',
      email: 'patient2@test.com',
      password: 'patient123',
      role: 'patient'
    });
    console.log('✅ Patients created: patient1@test.com, patient2@test.com / patient123');

    // Create doctors with user accounts
    const doctorData = [
      { name: 'Dr. Anil Kumar', department: 'General Medicine', avgConsultationTime: 12, isActive: true },
      { name: 'Dr. Sneha Reddy', department: 'Pediatrics', avgConsultationTime: 15, isActive: true },
      { name: 'Dr. Rajesh Gupta', department: 'Orthopedics', avgConsultationTime: 18, isActive: false },
      { name: 'Dr. Meera Iyer', department: 'Dermatology', avgConsultationTime: 10, isActive: true },
      { name: 'Dr. Vikram Singh', department: 'ENT', avgConsultationTime: 14, isActive: false }
    ];

    const doctors = [];
    for (const data of doctorData) {
      const emailSlug = data.name.toLowerCase().replace(/\./g, '').replace(/\s+/g, '.');
      const email = `${emailSlug}@hospital.com`;
      
      const user = await User.create({
        name: data.name,
        email,
        password: 'doctor123',
        role: 'doctor'
      });

      const doctor = await Doctor.create({
        ...data,
        userId: user._id
      });
      doctors.push(doctor);
      console.log(`✅ Created Doctor & User: ${data.name} (${email})`);
    }

    console.log(`✅ ${doctors.length} doctors with accounts created`);

    // Set initial emergency status
    await EmergencyStatus.create({
      status: 'Available',
      lastUpdatedAt: new Date(),
      updatedBy: staff._id,
      notes: 'Emergency ward operational'
    });
    console.log('✅ Emergency status initialized');

    console.log('\n🎉 Seed completed successfully!\n');
    console.log('Login Credentials:');
    console.log('──────────────────────────────────');
    console.log('Admin:   admin@queueless.com / admin123');
    console.log('Staff:   staff@queueless.com / staff123');
    console.log('Patient: patient1@test.com   / patient123');
    console.log('Doctor:  dr.anil.kumar@hospital.com / doctor123');
    console.log('Patient: patient2@test.com   / patient123');
    console.log('──────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
