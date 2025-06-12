const express = require('express');
const router = express.Router();

// Middleware to check admin access
function isAdmin(req, res, next) {
  if (req.headers.authorization && req.headers.authorization.includes('admin')) return next();
  return res.status(403).json({ error: 'Admin only' });
}

// POST /api/admin/create-election
router.post('/create-election', isAdmin, async (req, res) => {
  const pool = req.pool || req.app.get('pool');
  const { title, description, candidates } = req.body;
  if (!title || !description || !Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Insert election
    const [result] = await conn.query(
      'INSERT INTO elections (title, description) VALUES (?, ?)',
      [title, description]
    );
    const electionId = result.insertId;
    // Insert each candidate
    for (const name of candidates) {
      await conn.query(
        'INSERT INTO candidates (election_id, name) VALUES (?, ?)',
        [electionId, name]
      );
    }
    await conn.commit();
    res.json({ message: 'Election and candidates created!', electionId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Election creation failed', details: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;