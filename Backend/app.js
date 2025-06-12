const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const csvStringify = require('csv-stringify').stringify;

const authRoutes = require('./routes/auth');
const votingRoutes = require('./routes/voting');
const adminRoutes = require('./routes/admin'); // <-- Add this line

const app = express();
const PORT = 3000;

const dbConfig = {host:'localhost', user:'root', password:'Junior123@derrickondiek', database:'voting'};
let pool;
(async () => { pool = await mysql.createPool(dbConfig); })();

app.use(cors());
app.use(bodyParser.json());

// Make pool available to routes
app.use((req, res, next) => { req.pool = pool; next(); });

// Route modules
app.use('/api/auth', authRoutes);
app.use('/api/voting', votingRoutes);
app.use('/api/admin', adminRoutes); // <-- Add this line

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

// ... other routes, e.g., public elections, login-logs, etc.

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});