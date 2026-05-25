const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();

console.log('Starting test server...');
console.log('MONGODB_URI:', process.env.MONGODB_URI);

// Test MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/somalibd')
  .then(() => {
    console.log('✅ SUCCESS: Connected to MongoDB!');
    console.log('📡 Host:', mongoose.connection.host);
    console.log('🗄️  Database:', mongoose.connection.name);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
  });

// Add the health endpoint your app needs
app.get('/api/auth/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const host = mongoose.connection.host;
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  res.json({ 
    status: isConnected ? "ok" : "error", 
    isLocal,
    dbName: mongoose.connection.name 
  });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
