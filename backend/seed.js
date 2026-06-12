const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/User');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected for seeding');

    // Clear existing users to prevent duplicates during testing
    await User.deleteMany({});
    console.log('Cleared existing users');

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password123', salt);

    const users = [
      {
        name: 'Principal Account',
        email: 'principal@example.com',
        password,
        role: 'Principal'
      },
      {
        name: 'CoE Account',
        email: 'coe@example.com',
        password,
        role: 'CoE'
      }
    ];

    await User.insertMany(users);
    console.log('✅ Database seeded successfully with Admin, Faculty, and Student users.');
    console.log('You can log in with any of these emails and password: "password123"');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
