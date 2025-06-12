const API_BASE = 'http://localhost:3000/api';
let token = '';
let username = '';
let isAdmin = false;
let electionsGlobal = [];

function show(elem) { elem.classList.remove('hidden'); }
function hide(elem) { elem.classList.add('hidden'); }

function setMessage(id, msg, type = "") {
  let el = document.getElementById(id);
  el.textContent = msg || "";
  el.className = "msg" + (type ? " " + type : "");
}

function resetUI() {
  document.getElementById('reg-username').value = '';
  document.getElementById('reg-password').value = '';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('election-list').innerHTML = '';
  document.getElementById('candidate-list').innerHTML = '';
  document.getElementById('results-election-list').innerHTML = '';
  setMessage('register-message', '');
  setMessage('login-message', '');
  setMessage('vote-message', '');
  document.getElementById('results-output').textContent = '';
  hide(document.getElementById('already-voted'));
  hide(document.getElementById('thankyou'));
  hide(document.getElementById('user-section'));
  hide(document.getElementById('vote-section'));
  hide(document.getElementById('results-section'));
  show(document.getElementById('register-section'));
  show(document.getElementById('login-section'));
  document.getElementById('election-desc').textContent = '';
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  let btn = document.querySelector('.dark-toggle');
  let dark = document.body.classList.contains('dark-mode');
  btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  btn.textContent = dark ? '☀️ Light Mode' : '🌙 Dark Mode';
  localStorage.setItem('voting-dark', dark ? '1' : '0');
}
window.onload = function() {
  if (localStorage.getItem('voting-dark') === '1') document.body.classList.add('dark-mode');
  resetUI();
  loadElections();
};

function togglePassword(inputId, btn) {
  let input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "🙈";
    btn.setAttribute('aria-label', 'Hide password');
  } else {
    input.type = "password";
    btn.textContent = "👁️";
    btn.setAttribute('aria-label', 'Show password');
  }
}

function register() {
  const regUsername = document.getElementById('reg-username').value.trim();
  const regPassword = document.getElementById('reg-password').value.trim();
  if (!regUsername || !regPassword) {
    setMessage('register-message', "Username and password required", "error");
    return;
  }
  fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: regUsername, password: regPassword })
  })
    .then(res => res.json())
    .then(data => {
      if (data.token || data.success) {
        setMessage('register-message', "Registration successful! Please login to continue.", "success");
        // After registration, clear registration fields and focus login
        document.getElementById('reg-password').value = '';
        document.getElementById('reg-username').value = '';
        // Optionally switch to login form or focus login username field
        document.getElementById('login-username').focus();
      } else {
        setMessage('register-message', data.message || "Registration failed", "error");
      }
    });
}

function login() {
  const loginUsername = document.getElementById('login-username').value.trim();
  const loginPassword = document.getElementById('login-password').value.trim();
  if (!loginUsername || !loginPassword) {
    setMessage('login-message', "Username and password required", "error");
    return;
  }
  fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: loginUsername, password: loginPassword })
  })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        token = data.token;
        username = loginUsername;
        isAdmin = data.isAdmin || false;
        setMessage('login-message', "Login successful!", "success");
        onLogin();
      } else {
        setMessage('login-message', data.message || "Login failed", "error");
      }
    });
}

function logout() {
  token = '';
  username = '';
  isAdmin = false;
  resetUI();
  loadElections();
}

function onLogin() {
  document.getElementById('current-user').textContent = username;
  show(document.getElementById('user-section'));
  show(document.getElementById('vote-section'));
  hide(document.getElementById('register-section'));
  hide(document.getElementById('login-section'));
  // Show results section only for admin
  if (isAdmin) {
    show(document.getElementById('results-section'));
  } else {
    hide(document.getElementById('results-section'));
  }
  loadElections(true);
}

function loadElections(isLoggedIn) {
  fetch(`${API_BASE}/voting/elections`)
    .then(res => res.json())
    .then(elections => {
      electionsGlobal = elections;
      const electionList = document.getElementById('election-list');
      const resultsElectionList = document.getElementById('results-election-list');
      electionList.innerHTML = '';
      resultsElectionList.innerHTML = '';
      if (!elections.length) {
        let opt = document.createElement('option');
        opt.textContent = "No elections available";
        opt.value = "";
        electionList.appendChild(opt);
        resultsElectionList.appendChild(opt.cloneNode(true));
        document.getElementById('candidate-list').innerHTML = '';
        document.getElementById('election-desc').textContent = '';
        return;
      }
      elections.forEach(election => {
        const option = document.createElement('option');
        option.value = election.id;
        option.textContent = election.title;
        electionList.appendChild(option);

        const resultOption = document.createElement('option');
        resultOption.value = election.id;
        resultOption.textContent = election.title;
        resultsElectionList.appendChild(resultOption);
      });
      // Descriptions
      electionList.onchange = () => {
        showElectionDesc(electionList.value);
        loadCandidates(electionList.value);
        if (isLoggedIn) checkAlreadyVoted(electionList.value);
      };
      resultsElectionList.onchange = () => showResults();
      // Initial
      showElectionDesc(elections[0].id);
      loadCandidates(elections[0].id);
      if (isLoggedIn) checkAlreadyVoted(elections[0].id);
    });
}

function showElectionDesc(electionId) {
  let descDiv = document.getElementById('election-desc');
  let election = electionsGlobal.find(e => e.id == electionId);
  descDiv.textContent = election && election.description ? election.description : '';
}

function loadCandidates(electionId) {
  const election = electionsGlobal.find(e => e.id == electionId);
  const candidateList = document.getElementById('candidate-list');
  candidateList.innerHTML = '';
  if (election) {
    election.candidates.forEach(candidate => {
      const option = document.createElement('option');
      option.value = candidate;
      option.textContent = candidate;
      candidateList.appendChild(option);
    });
  }
}

function checkAlreadyVoted(electionId) {
  fetch(`${API_BASE}/voting/already-voted/${electionId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      if (data.alreadyVoted) {
        show(document.getElementById('already-voted'));
        document.getElementById('vote-btn').disabled = true;
      } else {
        hide(document.getElementById('already-voted'));
        document.getElementById('vote-btn').disabled = false;
      }
    });
}

function vote() {
  const electionId = parseInt(document.getElementById('election-list').value, 10);
  const candidate = document.getElementById('candidate-list').value;
  if (!electionId || !candidate) {
    setMessage('vote-message', "Please select an election and candidate.", "error");
    return;
  }
  // Confirmation dialog
  let candidateText = document.getElementById('candidate-list').selectedOptions[0].textContent;
  let electionText = document.getElementById('election-list').selectedOptions[0].textContent;
  if (!confirm(`Are you sure you want to vote for "${candidateText}" in "${electionText}"?`)) {
    return;
  }
  fetch(`${API_BASE}/voting/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ electionId, candidate })
  })
    .then(res => res.json())
    .then(data => {
      if (data.message && data.message.toLowerCase().includes("success")) {
        setMessage('vote-message', '');
        showThankYou();
      } else {
        setMessage('vote-message', data.message || JSON.stringify(data), "error");
      }
    });
}

function showThankYou() {
  show(document.getElementById('thankyou'));
  document.getElementById('vote-btn').disabled = true;
  setTimeout(() => {
    logout();
  }, 1700);
}

// Show results and total voters
function showResults() {
  const electionId = document.getElementById('results-election-list').value;
  if (!electionId) {
    document.getElementById('results-output').textContent = "Please select an election.";
    return;
  }
  fetch(`${API_BASE}/voting/results/${electionId}`)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.results) {
        document.getElementById('results-output').textContent = "No results found.";
        return;
      }
      let output = '';
      let total = 0;
      for (const [candidate, count] of Object.entries(data.results)) {
        output += `${candidate}: ${count}\n`;
        total += count;
      }
      output += `\nTotal voters: ${total}`;
      document.getElementById('results-output').textContent = output.trim();
    });
}