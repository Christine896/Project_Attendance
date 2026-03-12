const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // This line reads your .env file

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware (This helps the server understand JSON data)
app.use(cors());
app.use(express.json());
app.use('/api/auth', require('./routes/auth'));

// --- THE CONNECTION PART ---
// This uses the MONGO_URI from your .env file to talk to the cloud
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    // If the connection works, this message prints:
    console.log('✅ Connected to MongoDB Cloud!');
  })
  .catch((err) => {
    // If there is a mistake (like a wrong password), this prints:
    console.error('❌ MongoDB Connection Error:', err);
  });

// A simple route so you can test it in your browser
app.get('/', (req, res) => {
  res.send('The Brain is alive and connected to the Cloud!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is breathing on http://localhost:${PORT}`);
});