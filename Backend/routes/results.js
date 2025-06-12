const express = require('express');
const router = express.Router();

// Import elections array from voting.js
const votingModule = require('./voting');
let elections = votingModule.elections;

router.get('/:electionId', (req, res) => {
  const electionId = parseInt(req.params.electionId);
  const election = elections.find(e => e.id === electionId);
  if (!election) return res.status(404).json({ message: 'Election not found' });

  const results = {};
  election.candidates.forEach(candidate => {
    results[candidate] = 0;
  });
  Object.values(election.votes).forEach(candidate => {
    if (results[candidate] !== undefined) {
      results[candidate]++;
    }
  });

  res.json({ election: election.title, results });
});

module.exports = router;