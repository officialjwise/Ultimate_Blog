const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Initialize express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Import routes
const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes');
// const transactionRoutes = require('./routes/transactionRoutes');
// const supportRoutes = require('./routes/supportRoutes');
// const adminRoutes = require('./routes/adminRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/transactions', transactionRoutes);
// app.use('/api/support', supportRoutes);
// app.use('/api/admin', adminRoutes);

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Ultimate Blog API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});