const express = require('express');

module.exports = function(pool) {
  const router = express.Router();

  // Get all elections (with candidates)
  router.get('/elections', async (req, res) => {
    const [elections] = await pool.query('SELECT id, title, description FROM elections');
    for (const e of elections) {
      const [cands] = await pool.query('SELECT name FROM candidates WHERE election_id=?', [e.id]);
      e.candidates = cands.map(c => c.name);
    }
    res.json(elections);
  });

  // Get results for an election
  router.get('/results/:electionId', async (req, res) => {
    const electionId = req.params.electionId;
    const [candidates] = await pool.query('SELECT name FROM candidates WHERE election_id=?', [electionId]);
    const [votes] = await pool.query('SELECT candidate, COUNT(*) as count FROM votes WHERE election_id=? GROUP BY candidate', [electionId]);
    const results = {};
    candidates.forEach(c => results[c.name] = 0);
    votes.forEach(v => results[v.candidate] = v.count);
    res.json({results});
  });

  // Create a new election (with candidates)
  router.post('/elections', async (req, res) => {
    try {
      const { title, description, candidates } = req.body;
      if (!title || !candidates || !Array.isArray(candidates) || candidates.length === 0) {
        return res.status(400).json({ success: false, message: "Title and candidates are required." });
      }
      // Insert election
      const [electionResult] = await pool.query(
        'INSERT INTO elections (title, description) VALUES (?, ?)', [title, description]
      );
      const electionId = electionResult.insertId;
      // Insert candidates
      for (const cand of candidates) {
        await pool.query('INSERT INTO candidates (election_id, name) VALUES (?, ?)', [electionId, cand]);
      }
      res.json({ success: true, election: { id: electionId, title, description, candidates } });
    } catch (err) {
      res.status(500).json({ success: false, message: "Error creating election", error: err.message });
    }
  });

  // Update an election (title, description, and candidates)
  router.put('/elections/:id', async (req, res) => {
    try {
      const electionId = req.params.id;
      const { title, description, candidates } = req.body;
      await pool.query('UPDATE elections SET title=?, description=? WHERE id=?', [title, description, electionId]);
      // Remove old candidates & add new
      await pool.query('DELETE FROM candidates WHERE election_id=?', [electionId]);
      for (const cand of candidates) {
        await pool.query('INSERT INTO candidates (election_id, name) VALUES (?, ?)', [electionId, cand]);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: "Error updating election", error: err.message });
    }
  });

  // Delete an election and its candidates
  router.delete('/elections/:id', async (req, res) => {
    try {
      const electionId = req.params.id;
      await pool.query('DELETE FROM candidates WHERE election_id=?', [electionId]);
      await pool.query('DELETE FROM elections WHERE id=?', [electionId]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: "Error deleting election", error: err.message });
    }
  });

  // Admin: get login logs
  router.get('/admin/login-logs', async (req, res) => {
    const [logs] = await pool.query('SELECT username, login_time, ip_address FROM login_logs ORDER BY login_time DESC');
    res.json({logs});
  });

  // Admin: export login logs as CSV
  router.get('/admin/login-logs/export', async (req, res) => {
    const [logs] = await pool.query('SELECT username, login_time, ip_address FROM login_logs ORDER BY login_time DESC');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="login_logs.csv"');
    require('csv-stringify').stringify(logs, {header:true}).pipe(res);
  });

  return router;
};