const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (must be before API routes to avoid conflicts)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d', // Cache for 1 day
  etag: true
}));

// API Routes (must be before static files)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/support', require('./routes/support'));

// Serve static files from the React app build directory (only in production)
const frontendBuildPath = path.join(__dirname, '../frontend/build');

if (fs.existsSync(frontendBuildPath)) {
  // Serve static files from the React app build directory
  // The static middleware will pass through to next middleware if file not found
  app.use(express.static(frontendBuildPath, { 
    index: false, // Don't serve index.html automatically, we'll handle it in catch-all
    fallthrough: true // Pass through to next middleware if file not found
  }));

  // Catch-all handler: send back React's index.html file for any non-API routes
  // This fixes the 404 error on refresh for client-side routes
  // Handle all HTTP methods (GET, POST, etc.) for SPA routing
  app.all('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'API route not found' });
    }
    // For all other routes (including /admin/login, /admin/dashboard, etc.), 
    // serve index.html to let React Router handle routing
    res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
      if (err) {
        console.error('Error sending index.html:', err);
        res.status(500).json({ message: 'Error loading application' });
      }
    });
  });
} else {
  // In development, if build doesn't exist, just handle API routes
  app.all('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      return res.status(404).json({ 
        message: 'Frontend build not found. Please run "npm run build" in the frontend directory.' 
      });
    }
    res.status(404).json({ message: 'API route not found' });
  });
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://khuntakash1211_db_user:lZH3uGqPnScmNLJS@cluster0.ax0teyf.mongodb.net/growloan?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB Connected Successfully');
  
  // Start payment failure cron job after MongoDB connection
  const { startPaymentFailureCron } = require('./utils/paymentFailureCron');
  startPaymentFailureCron();
  
  // Start profile completion reminder cron job
  const { startProfileCompletionCron } = require('./utils/profileCompletionCron');
  startProfileCompletionCron();
})
.catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
