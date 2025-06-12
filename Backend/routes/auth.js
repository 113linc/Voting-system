const express = require('express');

module.exports = function(pool) {
  const router = express.Router();

  // Login handler
  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    // Example: simple check, replace with secure logic in production!
    const [rows] = await pool.query('SELECT * FROM users WHERE username=? AND password=?', [username, password]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    // Log login
    await pool.query('INSERT INTO login_logs (username, ip_address) VALUES (?, ?)', [username, req.ip]);
    const isAdmin = rows[0].is_admin === 1;
    res.json({ token: 'exampletoken', isAdmin });
  });

  return router;
};