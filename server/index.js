const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. UPDATED CORS: Explicitly allow the Vite network host
app.use(cors({
  origin: '*', // Allows all devices on your Wi-Fi to connect
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/api/auth', require('./routes/auth'));
app.use('/api/units', require('./routes/unit'));
app.use('/api/attendance', require('./routes/attendance'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Cloud!');
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
  });

app.get('/', (req, res) => {
  res.send('The Brain is alive and connected to the Cloud!');
});

// 2. UPDATED LISTEN: Use '0.0.0.0' to listen to the whole network
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is broadcasting on:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://[YOUR_LAPTOP_IP]:${PORT}`);
});