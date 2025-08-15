const mongoose = require('mongoose');

const connectDB = () => {
  console.log('Attempting to connect to MongoDB...');
  console.log('Username:', process.env.DB_USERNAME ? 'Set' : 'Not set');
  console.log('Password:', process.env.DB_PASSWORD ? 'Set' : 'Not set');
  
  const dbLink = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.yjmnpco.mongodb.net/smart_study_scheduler?retryWrites=true&w=majority&appName=Cluster0`;
  
  console.log('Connection string:', dbLink.replace(/\/\/.*@/, '//***:***@'));

  mongoose.connect(dbLink)
    .then(function(connection){
      console.log("Connected to MongoDB successfully!")
    }).catch(err => {
      console.log('MongoDB connection error:', err.message);
      if (err.message.includes('bad auth')) {
        console.log('Authentication failed. Please check:');
        console.log('1. Username and password are correct');
        console.log('2. IP address is whitelisted in MongoDB Atlas');
        console.log('3. Database user has proper permissions');
      }
    })
};

module.exports = connectDB;
