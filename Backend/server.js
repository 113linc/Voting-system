const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Database connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',         // change to your MySQL user
  password: 'Junior123@derrickondiek',         // change to your MySQL password
  database: 'voting',   // your database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- AUTH ROUTER ---
const authRouter = express.Router();

// Login handler
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username=? AND password=?',
      [username, password]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    // Log login
    await pool.query(
      'INSERT INTO login_logs (username, ip_address) VALUES (?, ?)',
      [username, req.ip]
    );
    const isAdmin = rows[0].is_admin === 1;
    res.json({ token: 'exampletoken', isAdmin });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.use('/api/auth', authRouter);

// --- VOTING ROUTER ---
const votingRouter = express.Router();

// Get all elections
votingRouter.get('/elections', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM elections');
    // Each election should have a candidates array (from CSV)
    const elections = rows.map(e => ({
      ...e,
      candidates: typeof e.candidates === 'string'
        ? e.candidates.split(',').map(s => s.trim())
        : []
    }));
    res.json(elections);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch elections' });
  }
});

// Create an election
votingRouter.post('/elections', async (req, res) => {
  const { title, description, candidates } = req.body;
  if (!title || !candidates || !Array.isArray(candidates)) {
    return res.status(400).json({ error: 'Title and candidates required' });
  }
  try {
    await pool.query(
      'INSERT INTO elections (title, description, candidates) VALUES (?, ?, ?)',
      [title, description, candidates.join(',')]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not create election' });
  }
});

// Update an election
votingRouter.put('/elections/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, candidates } = req.body;
  if (!title || !candidates || !Array.isArray(candidates)) {
    return res.status(400).json({ error: 'Title and candidates required' });
  }
  try {
    await pool.query(
      'UPDATE elections SET title=?, description=?, candidates=? WHERE id=?',
      [title, description, candidates.join(','), id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not update election' });
  }
});

// Delete an election
votingRouter.delete('/elections/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM elections WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete election' });
  }
});

// Get login logs for admin
votingRouter.get('/admin/login-logs', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT username, login_time, ip_address FROM login_logs ORDER BY login_time DESC'
    );
    res.json({ logs: rows });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch logs' });
  }
});

// Export login logs as CSV
votingRouter.get('/admin/login-logs/export', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT username, login_time, ip_address FROM login_logs ORDER BY login_time DESC'
    );
    const csv = [
      'Username,Login Time,IP Address',
      ...rows.map(r =>
        [r.username, r.login_time, r.ip_address].map(x =>
          `"${String(x).replace(/"/g, '""')}"`
        ).join(',')
      )
    ].join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="login_logs.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).send('Could not export logs');
  }
});

// Manual vote update (admin): Inject/correct votes
votingRouter.post('/admin/results/manual-update', async (req, res) => {
  const { electionId, candidate, count } = req.body;
  if (!electionId || !candidate || typeof count !== 'number') {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  try {
    // Check if vote already exists for that candidate in that election
    const [voteRows] = await pool.query(
      'SELECT * FROM votes WHERE election_id=? AND candidate=?',
      [electionId, candidate]
    );
    if (voteRows.length === 0) {
      // Insert new
      await pool.query(
        'INSERT INTO votes (election_id, candidate, vote_count) VALUES (?, ?, ?)',
        [electionId, candidate, count]
      );
    } else {
      // Update existing
      await pool.query(
        'UPDATE votes SET vote_count=? WHERE election_id=? AND candidate=?',
        [count, electionId, candidate]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not update votes' });
  }
});

app.use('/api/voting', votingRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});