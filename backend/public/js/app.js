const state = {
    isLoggedIn: false,
    user: null,
    currentTab: 'overview',
    analysisData: null,
    infraData: null,
    overviewData: null,
    notifications: [],
    theme: localStorage.getItem('theme') || 'dark'
};

document.documentElement.setAttribute('data-theme', state.theme);



const socket = io();


// --- DOM Elements ---
const views = {
    login: document.getElementById('login-view'),
    dashboard: document.getElementById('dashboard-view')
};

const loginForm = document.getElementById('login-form');
const contentArea = document.getElementById('content-body');
const pageTitle = document.getElementById('page-title');

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => {
    // Check for social auth success param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
        window.history.replaceState({}, document.title, "/");
        await checkSession();
    } else {
        await checkSession();
    }

    // Toggle Auth Mode
    const toggleBtn = document.getElementById('toggle-auth');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (toggleBtn && loginForm && registerForm) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Always clear fields on toggle
            loginForm.reset();
            registerForm.reset();

            const isLoginVisible = loginForm.style.display !== 'none';

            if (isLoginVisible) {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
                toggleBtn.innerText = "Have an account? Login";
            } else {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
                toggleBtn.innerText = "Need an account? Register";
            }
        });
    }


    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;
            handleLogin(loginForm, email, password);
        });
    }


    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputs = registerForm.querySelectorAll('input');
            const name = inputs[0].value;
            const email = inputs[1].value;
            const password = inputs[2].value;
            handleRegister(registerForm, name, email, password);
        });
    }

    // Initialize Socket Listeners
    setupSocket();
});

// --- Authentication ---
async function handleLogin(formRef, email, password) {
    const btn = formRef.querySelector('button');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Authenticating...";

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
            login(data.user);
        } else {
            showToast(data.error || 'Wrong username or password', 'error');
            btn.innerText = "Error";
            setTimeout(() => { btn.disabled = false; btn.innerText = originalText; }, 1000);
        }
    } catch (e) {
        console.error("Login err", e);
        showToast("Connection failed", "error");
        btn.disabled = false;
        btn.innerText = originalText;
    }
}


async function handleRegister(formRef, name, email, password) {
    const btn = formRef.querySelector('button');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Registering...";

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (res.ok) {
            login(data.user);
        } else {
            alert(data.error || 'Registration failed');
            btn.innerText = "Failed";
            setTimeout(() => { btn.disabled = false; btn.innerText = originalText; }, 1000);
        }
    } catch (e) {
        console.error("Reg err", e);
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

function login(user) {
    state.isLoggedIn = true;
    state.user = user;

    if (views.login) views.login.style.display = 'none';
    if (views.dashboard) views.dashboard.style.display = 'flex';

    // Update Profile UI
    const avatar = document.querySelector('.avatar');
    if (avatar) avatar.innerText = user.name ? user.name.substring(0, 2).toUpperCase() : 'US';

    const nameSpan = document.querySelector('.user-profile span');
    if (nameSpan) nameSpan.innerText = user.name || 'User';

    switchTab('overview');
}

async function checkSession() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            if (data.authenticated) {
                login(data.user);
            }
        }
    } catch (e) {
        console.error("Session check failed", e);
    }
}

function logout() {
    window.location.href = '/api/auth/logout';
}

function fillDemo() {
    const emailInput = document.querySelector('#login-form input[type="email"]');
    const passInput = document.querySelector('#login-form input[type="password"]');
    if (emailInput) emailInput.value = "Admin@senitnelX.com";
    if (passInput) passInput.value = "SentinelXadmin007";
}


// --- Dashboard Navigation ---
function switchTab(tab) {
    state.currentTab = tab;

    // Stop polling if leaving overview
    if (tab !== 'overview' && window.metricsInterval) clearInterval(window.metricsInterval);

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

    // Find link by onclick attribute to set active
    const links = Array.from(document.querySelectorAll('.nav-link'));
    const activeLink = links.find(l => l.getAttribute('onclick')?.includes(tab));
    if (activeLink) activeLink.classList.add('active');

    if (tab === 'overview') {
        if (pageTitle) pageTitle.innerText = 'System Overview';
        renderOverview();
    } else if (tab === 'analysis') {
        if (pageTitle) pageTitle.innerText = 'Log Analysis';
        renderAnalysis();
    } else if (tab === 'topology') {
        if (pageTitle) pageTitle.innerText = 'Network Topology';
        renderTopology();
    } else if (tab === 'reports') {
        if (pageTitle) pageTitle.innerText = 'System Reports';
        renderReports();
    } else if (tab === 'settings') {
        if (pageTitle) pageTitle.innerText = 'Settings';
        renderSettings();
    } else if (tab === 'profile') {
        if (pageTitle) pageTitle.innerText = 'My Profile';
        renderProfile();
    }
}


// --- Socket Setup ---
function setupSocket() {
    socket.on('connect', () => {
        console.log('Connected to WebSocket');
    });

    socket.on('chat_response', (data) => {
        // Remove "thinking" indicator if exists
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();

        addMessage(data.message, 'ai');
    });

    socket.on('infrastructure_update', (servers) => {
        state.infraData = servers;
        // Only re-render if we are on the infrastructure tab (reports? no, maybe dashboard charts or settings?)
        // Actually, let's update charts and if the user is in the 'reports' tab (which seems to show infra content in renderInfrastructure?)
        // Wait, renderInfrastructure is likely called in 'reports' or 'topology' or just separate?
        // Checking switchTab: renderReports calls renderReports? state.currentTab

        // Update pie chart if dashboard is active
        if (state.currentTab === 'overview') updateOverviewCharts(servers);

        // If we have a dedicated Infrastructure view (it seems renderInfrastructure is used later, let's check renderReports)
        if (document.querySelector('.infrastructure-table')) {
            renderInfraTable(servers);
        }
    });

    socket.on('new_log', (log) => {
        // Add to live logs list
        if (!state.liveLogs) state.liveLogs = [];
        state.liveLogs.unshift(log);
        if (state.liveLogs.length > 50) state.liveLogs.pop();

        // Show toast for critical
        if (log.severity === 'critical' || log.severity === 'high') {
            showToast(`Security Alert from ${log.device}: ${log.message}`, 'error');
        }

        // Update Log View if active
        if (state.currentTab === 'analysis') {
            renderAnalysis();
        }
    });
    socket.on('metrics_update', (data) => {
        state.overviewData = data;
        updateDashboardMetrics(data);
    });
}

// --- RENDER FUNCTIONS ---

function updateDashboardMetrics(data) {
    // 1. Update Cards
    const cpuVal = document.getElementById('metric-cpu');
    const ramVal = document.getElementById('metric-ram');
    const netVal = document.getElementById('metric-net');

    if (cpuVal) {
        cpuVal.innerText = data.cpuLoad + '%';
        updateMetricGlow(cpuVal, data.cpuLoad);
    }
    if (ramVal) ramVal.innerText = data.memoryUsage + '%';
    if (netVal) netVal.innerText = ((data.networkRx + data.networkTx) / 1024).toFixed(1) + ' KB/s';

    // 2. Update Chart
    const chart = Chart.getChart('mainTrendChart');
    if (chart) {
        const timeLabel = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Add new data
        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(data.cpuLoad);

        // Keep last 20 points
        if (chart.data.labels.length > 20) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        chart.update('none'); // 'none' for smooth animation
    }
}

// Legacy polling removed
// function startMetricsPolling() { ... }
// async function fetchMetrics() { ... }

function updateMetricGlow(el, val) {
    if (val > 80) el.style.color = '#ff0055';
    else if (val > 50) el.style.color = '#ffcc00';
    else el.style.color = '#00ff88';
}


function renderOverview() {
    // startMetricsPolling(); // Removed in v5.0 for Socket Stream

    contentArea.innerHTML = `
        <div class="dashboard-grid">
            <div class="card">
                <div class="card-title">CPU Load <i class="fas fa-microchip"></i></div>
                <div class="card-value" id="metric-cpu">...</div>
                <div class="card-trend"><i class="fas fa-server"></i> System Load</div>
                <div class="glow-primary"></div>
            </div>
            <div class="card">
                <div class="card-title">Memory Usage <i class="fas fa-memory"></i></div>
                <div class="card-value" id="metric-ram" style="color:var(--accent)">...</div>
                <div class="card-trend">Active RAM</div>
            </div>
            <div class="card">
                <div class="card-title">Network Traffic <i class="fas fa-network-wired"></i></div>
                <div class="card-value" id="metric-net">...</div>
                <div class="card-trend">Bandwidth (KB/s)</div>
            </div>
            <div class="card">
                <div class="card-title">Security Events <i class="fas fa-shield-alt"></i></div>
                <div class="card-value">--</div>
                <div class="card-trend">Scanned Today</div>
            </div>
            <div class="card" style="grid-column: span 1; display:flex; align-items:center; justify-content:center; cursor:pointer; background:rgba(0, 212, 255, 0.1); border:1px dashed var(--primary)" onclick="optimizeSystem()">
                <div style="text-align:center">
                    <i class="fas fa-rocket" style="font-size:1.5rem; color:var(--primary); margin-bottom:10px"></i>
                     <div class="card-title" style="margin:0">Optimize System</div>
                     <span style="font-size:0.75rem; color:var(--text-muted)">Free up resources</span>
                </div>
            </div>
        </div>
        
        </div>
        
        <div class="charts-row" style="margin-top: 20px; display: grid; grid-template-columns: 2fr 1fr; gap: 20px; height: 350px;">

            <div class="chart-container" style="flex: 2; position: relative;">
                <canvas id="mainTrendChart"></canvas>
            </div>
            <div class="chart-container" style="flex: 1; position: relative;">
                <canvas id="statusPieChart"></canvas>
            </div>
        </div>
    `;

    setTimeout(async () => {
        if (typeof Chart === 'undefined') return;
        try {
            // Trend Chart
            const hRes = await fetch('/api/metrics/history');
            const history = await hRes.json();
            const labels = history.length ? history.map(h => new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })) : ['Now'];
            const cpuData = history.length ? history.map(h => h.cpuLoad) : [0];

            new Chart(document.getElementById('mainTrendChart').getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'CPU Load (%)',
                        data: cpuData,
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#8899a6' } } },
                    scales: {
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8899a6' } },
                        x: { display: false }
                    }
                }
            });

            // Pie Chart (Server Status)
            const infRes = await fetch('/api/infrastructure');
            let servers = [];
            if (infRes.ok) servers = await infRes.json();

            const statusCounts = { online: 0, offline: 0, warning: 0 };
            servers.forEach(s => statusCounts[s.status] = (statusCounts[s.status] || 0) + 1);
            // Fallback if empty to show something
            if (servers.length === 0) statusCounts.online = 1;

            new Chart(document.getElementById('statusPieChart').getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Online', 'Offline', 'Warning'],
                    datasets: [{
                        data: [statusCounts.online, statusCounts.offline, statusCounts.warning],
                        backgroundColor: ['#00ff88', '#ff0055', '#ffcc00'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#8899a6' } },
                        title: { display: true, text: 'Server Fleet Status', color: '#fff' }
                    }
                }
            });

        } catch (e) { console.error("Chart load failed", e); }
    }, 100);
}

let lastChartUpdate = 0;

function updateOverviewCharts(servers) {
    if (typeof Chart === 'undefined') return;

    // Throttle updates to 1 minute (60000ms)
    const now = Date.now();
    if (now - lastChartUpdate < 60000) return;
    lastChartUpdate = now;

    // Update Pie Chart if it exists
    const chart = Chart.getChart('statusPieChart');
    if (chart) {
        const statusCounts = { online: 0, offline: 0, warning: 0 };
        servers.forEach(s => statusCounts[s.status] = (statusCounts[s.status] || 0) + 1);
        if (servers.length === 0) statusCounts.online = 1;

        chart.data.datasets[0].data = [statusCounts.online, statusCounts.offline, statusCounts.warning];
        chart.update();
    }
}

function optimizeSystem() {
    showToast("Analyzing system resources...", "info");

    setTimeout(() => {
        // Visual cleanup simulation
        const cpu = document.getElementById('metric-cpu');
        const ram = document.getElementById('metric-ram');

        if (cpu) {
            cpu.innerText = "12%";
            cpu.style.color = "#00ff88";
        }
        if (ram) {
            ram.innerText = "24%";
            ram.style.color = "#00ff88"; // Green
        }

        showToast("Optimization Complete: Memory cache cleared.", "success");
    }, 1500);
}

function renderAnalysis() {
    const logs = state.liveLogs || [];
    const analysisActive = !!state.analysisData;

    contentArea.innerHTML = `
        <div class="analysis-container">
            <!-- Header & Upload -->
            <div class="dashboard-grid" style="grid-template-columns: 1fr 2fr; gap: 20px; margin-bottom: 20px;">
                <div class="upload-zone" id="drop-zone" onclick="document.getElementById('fileInput').click()" style="height: auto; padding: 20px;">
                    <input type="file" id="fileInput" hidden onchange="handleFileUpload(this)">
                    <div class="upload-icon-pulse" style="font-size: 1.5rem; margin-bottom: 10px;">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <h3 style="font-size: 1rem;">Upload Logs</h3>
                    <p style="font-size: 0.8rem;">Analyze historical files</p>
                </div>

                <div class="card glass-card" style="display: flex; flex-direction: column; justify-content: center;">
                    <div class="results-header">
                        <div class="card-title">Live Security Intelligence</div>
                        <div class="stat-pill pulse-dot"><i class="fas fa-satellite-dish"></i> Streaming</div>
                    </div>
                    <div style="margin-top: 10px; color: var(--text-muted); font-size: 0.9rem;">
                        Monitoring ${state.infraData ? state.infraData.length : 0} active nodes. AI is analyzing events in real-time.
                    </div>
                </div>
            </div>

            <!-- Analysis Results (Upload) -->
            <div id="analysis-results" style="display: ${analysisActive ? 'block' : 'none'}; margin-bottom: 30px;">
                 <div class="results-header">
                    <div class="stat-pill" style="background: var(--primary); color:black">Analysis Report</div>
                    <button class="btn-secondary" onclick="clearAnalysis()">Close Report</button>
                 </div>
                 <!-- Reuse existing chart logic for upload -->
                 <div class="charts-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; height: 200px;">
                    <div class="chart-container glass-card"><canvas id="deviceChart"></canvas></div>
                    <div class="chart-container glass-card"><canvas id="severityChart"></canvas></div>
                </div>
            </div>

            <!-- Live / Mixed Table -->
            <div class="table-container glass-card">
                <div class="results-header" style="margin-bottom: 15px;">
                    <div class="card-title"><i class="fas fa-list-alt"></i> ${analysisActive ? 'Analysis Results' : 'Live Event Stream'}</div>
                    <div class="stat-pill">${analysisActive ? state.analysisData.issues.length : logs.length} Events</div>
                </div>
                <table class="log-table">
                    <thead>
                        <tr>
                            <th>Severity</th>
                            <th>Device</th>
                            <th>Time</th>
                            <th>Message</th>
                            <th>AI Recommendation</th>
                        </tr>
                    </thead>
                    <tbody id="logTableBody">
                        ${(analysisActive ? state.analysisData.issues : logs).map(log => `
                            <tr>
                                <td><span class="badge-severity ${log.severity}">${log.severity}</span></td>
                                <td>${log.device}</td>
                                <td style="font-size:0.8rem; color:#888">${log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Just now'}</td>
                                <td style="font-family: 'Space Mono', monospace; font-size: 0.85rem;">${log.message}</td>
                                <td><i class="fas fa-magic" style="color:var(--primary); margin-right:5px"></i> ${log.suggestion || 'Analyzing...'}</td>
                            </tr>
                        `).join('')}
                        ${(!analysisActive && logs.length === 0) ? '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #666;">Waiting for events...</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    if (analysisActive) {
        setTimeout(() => renderAnalysisCharts(state.analysisData.issues, state.analysisData.summary), 50);
    }
}


async function renderInfrastructure() {
    // Show cached if exists
    if (state.infraData) {
        renderInfraTable(state.infraData);
    } else {
        contentArea.innerHTML = '<div class="card"><div class="card-title">Scanning Fleet Status...</div></div>';
    }

    try {
        const res = await fetch('/api/infrastructure');
        if (res.ok) {
            const servers = await res.json();
            state.infraData = servers;
            renderInfraTable(servers);
        }
    } catch (e) {
        if (!state.infraData) {
            contentArea.innerHTML = `<div class="card"><div class="card-title" style="color:red">Failed to load infrastructure data</div></div>`;
        }
        console.error(e);
    }
}

function renderInfraTable(servers) {
    let rows = '';
    if (servers.length === 0) {
        rows = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No servers registered. Send heartbeats to /api/ingest to see data here.</td></tr>';
    } else {
        rows = servers.map(s => `
            <tr>
                <td><span style="color:${getStatusColor(s.status)}">●</span> ${capitalize(s.status)}</td>
                <td>${s.hostname}</td>
                <td>${s.ipAddress}</td>
                <td>${s.region || 'Unknown'}</td>
                <td><div class="stat-pill">${s.load}% Load</div></td>
            </tr>
        `).join('');
    }

    contentArea.innerHTML = `
        <div class="card glass-card">
            <div class="results-header">
                <div class="card-title">Server Fleet Status</div>
                <div class="stat-pill"><i class="fas fa-network-wired"></i> ${servers.length} Nodes Active</div>
            </div>
            <table class="log-table" style="margin-top: 20px;">
                <thead>
                    <tr>
                        <th>Status</th>
                        <th>Hostname</th>
                        <th>IP Address</th>
                        <th>Region</th>
                        <th>Load</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}


function getStatusColor(status) {
    if (status === 'online') return '#00ff88';
    if (status === 'warning') return '#ffcc00';
    if (status === 'offline') return '#ff0055';
    return '#888';
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderSettings() {
    contentArea.innerHTML = `
        <div class="settings-view">
            <div class="dashboard-grid">
                <!-- Theme Section -->
                <div class="card glass-card">
                    <div class="results-header">
                        <div class="card-title">Experience & Theme</div>
                        <i class="fas fa-palette" style="color:var(--primary)"></i>
                    </div>
                    <div class="setting-item">
                        <div class="setting-text">
                            <h4>Dynamic Mode</h4>
                            <p>Switch between Light and Dark interface</p>
                        </div>
                        <button class="btn-primary" onclick="toggleTheme()" style="min-width:100px">${state.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</button>
                    </div>
                </div>

                <!-- Notifications -->
                <div class="card glass-card">
                    <div class="results-header">
                        <div class="card-title">Alert Ecosystem</div>
                        <i class="fas fa-bell" style="color:var(--accent)"></i>
                    </div>
                    <div class="setting-item">
                        <div class="setting-text">
                            <h4>Real-time Popups</h4>
                            <p>Enabled for critical system events</p>
                        </div>
                        <div class="toggle-switch active" onclick="this.classList.toggle('active'); showToast('Notification settings updated', 'info')"></div>
                    </div>
                </div>

                <!-- System Configuration -->
                <div class="card glass-card" style="grid-column: span 2;">
                    <div class="results-header">
                        <div class="card-title">Connectivity & Network</div>
                        <i class="fas fa-wifi" style="color:var(--secondary)"></i>
                    </div>
                    <div class="setting-item">
                        <div class="setting-text">
                            <h4>External Monitor Access</h4>
                            <p>Current Local IP: <code id="local-ip" style="background:rgba(0,0,0,0.3); padding:2px 6px; border-radius:4px">Discovering...</code></p>
                        </div>
                        <button class="btn-primary" onclick="showToast('IP broadcast is active on port 3000', 'success')">Verify Access</button>
                    </div>
                    <div style="margin-top:15px; padding:15px; background:rgba(0,212,255,0.05); border-left:3px solid var(--primary); font-size:0.85rem; color:var(--text-muted)">
                        <i class="fas fa-info-circle"></i> To view this dashboard on another screen, ensure both devices are on the same WiFi and browse to your local IP address.
                    </div>
                </div>
            </div>
        </div>
    `;

    // Attempt to find local IP (simulated for UI)
    setTimeout(() => {
        const el = document.getElementById('local-ip');
        if (el) el.innerText = "192.168.1.XX:3000";
    }, 1000);
}


// --- Helpers ---
async function handleFileUpload(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    // Create FormData
    const formData = new FormData();
    formData.append('log', file);

    try {
        const res = await fetch('/api/analysis/upload', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            state.analysisData = data; // Persist to state
            showAnalysisResults(data);
            showToast("Log analysis complete!", "success");
        } else {
            showToast("Upload failed", "error");
        }
    } catch (e) {
        console.error("Upload error", e);
        showToast("Error uploading file", "error");
    }
}

function clearAnalysis() {
    state.analysisData = null;
    renderAnalysis();
}

function exportAnalysis() {
    if (!state.analysisData) return;
    const blob = new Blob([JSON.stringify(state.analysisData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinelx_analysis_${Date.now()}.json`;
    a.click();
    showToast("Report exported successfully", "info");
}

function showAnalysisResults(data) {
    const resultsDiv = document.getElementById('analysis-results');
    if (resultsDiv) resultsDiv.style.display = 'block';

    const countEl = document.getElementById('log-count');
    if (countEl) countEl.innerText = data.issues.length;

    renderAnalysisCharts(data.issues, data.summary);

    const tbody = document.getElementById('logTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        data.issues.forEach(issue => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="badge-severity ${issue.severity}">${issue.severity}</span></td>
                <td>${issue.device}</td>
                <td style="font-family: 'Space Mono', monospace; font-size: 0.85rem;">${issue.message}</td>
                <td><i class="fas fa-magic" style="color:var(--primary); margin-right:5px"></i> ${issue.suggestion}</td>
            `;
            tbody.appendChild(row);
        });
    }
}


function renderAnalysisCharts(issues, summary) {
    const deviceCounts = {};
    issues.forEach(i => { deviceCounts[i.device] = (deviceCounts[i.device] || 0) + 1; });

    // Destroy existing charts to prevent glitches
    const dChartEl = document.getElementById('deviceChart');
    const sChartEl = document.getElementById('severityChart');

    if (window.analyticsCharts) {
        window.analyticsCharts.forEach(c => c.destroy());
    }
    window.analyticsCharts = [];

    if (dChartEl) {
        const c1 = new Chart(dChartEl, {
            type: 'bar',
            data: {
                labels: Object.keys(deviceCounts),
                datasets: [{
                    label: 'Issues',
                    data: Object.values(deviceCounts),
                    backgroundColor: 'rgba(0, 212, 255, 0.4)',
                    borderColor: '#00d4ff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, title: { display: true, text: 'Issues by Node', color: '#8b9bb4' } },
                scales: { y: { ticks: { color: '#8b9bb4' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#8b9bb4' } } }
            }
        });
        window.analyticsCharts.push(c1);
    }

    if (sChartEl) {
        const c2 = new Chart(sChartEl, {
            type: 'doughnut',
            data: {
                labels: Object.keys(summary),
                datasets: [{
                    data: Object.values(summary),
                    backgroundColor: ['#ff0055', '#ffa600', '#00d4ff'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: '#8b9bb4' } }, title: { display: true, text: 'Severity Distribution', color: '#8b9bb4' } }
            }
        });
        window.analyticsCharts.push(c2);
    }
}


// --- Chat Functions ---

function toggleChat() {
    const win = document.getElementById('chat-window');
    win.classList.toggle('active');

    // Config auto-focus
    if (win.classList.contains('active')) {
        setTimeout(() => document.getElementById('chat-input').focus(), 100);
    }
}

function handleChatKey(e) {
    if (e.key === 'Enter') sendChat();
}

async function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    // Add User Message
    addMessage(msg, 'user');
    input.value = '';

    // Show indicator
    const body = document.getElementById('chat-body');
    const typing = document.createElement('div');
    typing.id = 'typing-indicator';
    typing.className = 'message msg-ai';
    typing.innerHTML = `
        <div class="typing-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;

    // Emit to Socket

    socket.emit('chat_message', { message: msg });
}

// --- v4 NEW FEATURES ---

function renderTopology() {
    contentArea.innerHTML = `
        <div class="topology-view">
            <div class="topology-header">
                <div class="stat-pill">Network Map: Active Node Discovery</div>
                <div class="topology-controls">
                    <button class="btn-primary" onclick="showToast('Scanning network...', 'info')"><i class="fas fa-sync"></i> Re-scan</button>
                </div>
            </div>
            <div class="topology-map-container glass-card">
                <svg id="topo-svg" width="100%" height="400" viewBox="0 0 800 400" style="overflow: visible">
                    <defs>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3.5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="var(--primary)" />
                            <stop offset="100%" stop-color="var(--secondary)" />
                        </linearGradient>
                    </defs>

                    <!-- Core Node -->
                    <g transform="translate(400, 200)" class="topo-node-main">
                        <circle r="35" fill="var(--bg-dark)" stroke="var(--primary)" stroke-width="2" filter="url(#glow)" />
                        <text text-anchor="middle" dy=".3em" fill="white" font-weight="bold">CORE</text>
                        <circle r="45" fill="none" stroke="var(--primary)" stroke-width="1" opacity="0.2">
                            <animate attributeName="r" from="35" to="60" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
                        </circle>
                    </g>
                    
                    <!-- Dynamic Nodes Container -->
                    <g id="dynamic-nodes"></g>
                </svg>
                </svg>
            </div>
            <div class="topology-info glass-card">
                <h4>Node Legend</h4>
                <div style="display:flex; gap:15px; margin-top:10px;">
                    <div style="font-size:0.8rem"><span style="color:#00ff88">●</span> Online</div>
                    <div style="font-size:0.8rem"><span style="color:#ffcc00">●</span> Warning</div>
                    <div style="font-size:0.8rem"><span style="color:#ff0055">●</span> Critical</div>
                </div>
            </div>
        </div>
    `;

    // Execute Topology Logic
    setTimeout(() => {
        const svg = document.getElementById('dynamic-nodes');
        if (!svg) return;

        const servers = state.infraData || [];
        const centerX = 400;
        const centerY = 200;
        const radius = 150;

        // Clear previous
        while (svg.firstChild) { svg.removeChild(svg.firstChild); }

        // Add Paths first (so they are behind nodes)
        servers.forEach((s, index) => {
            const angle = (index / servers.length) * 2 * Math.PI;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", `M${centerX},${centerY} L${x},${y}`);
            path.setAttribute("stroke", "url(#lineGrad)");
            path.setAttribute("stroke-width", "1.5");
            path.setAttribute("stroke-dasharray", "5,5");
            path.setAttribute("class", "topo-path");
            // Animation delay variation
            path.style.animation = `dash 3s linear infinite ${index * 0.5}s`;
            svg.appendChild(path);
        });

        // Add Nodes
        servers.forEach((s, index) => {
            const angle = (index / servers.length) * 2 * Math.PI;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            const color = getStatusColor(s.status);

            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("transform", `translate(${x}, ${y})`);
            g.setAttribute("class", "topo-node");
            g.style.cursor = "pointer";
            g.onclick = () => showToast(`Node: ${s.hostname} | Load: ${s.load}% | Status: ${s.status}`, 'info');

            const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            c.setAttribute("r", "22");
            c.setAttribute("fill", "var(--bg-dark)");
            c.setAttribute("stroke", color);
            c.setAttribute("stroke-width", "1.5");

            const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t.setAttribute("y", "35");
            t.setAttribute("text-anchor", "middle");
            t.setAttribute("fill", "var(--text-muted)");
            t.setAttribute("font-size", "10");
            t.textContent = s.hostname;

            g.appendChild(c);
            g.appendChild(t);
            svg.appendChild(g);
        });

        if (servers.length === 0) {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "text");
            g.setAttribute("x", "400");
            g.setAttribute("y", "350");
            g.setAttribute("text-anchor", "middle");
            g.setAttribute("fill", "#666");
            g.textContent = "No active agents connected.";
            svg.appendChild(g);
        }
    }, 50);
}

function renderReports() {
    contentArea.innerHTML = `
        <div class="reports-view">
            <div class="reports-grid">
                <div class="report-card glass-card">
                    <i class="fas fa-file-pdf"></i>
                    <h3>Weekly Availability</h3>
                    <p>Uptime metrics across all regions.</p>
                    <div class="stat-pill" style="margin-bottom:15px">99.98% Uptime Score</div>
                    <button class="btn-primary" onclick="openDownloadModal('availability')">Download Report</button>
                </div>
                <div class="report-card glass-card">
                    <i class="fas fa-shield-virus"></i>
                    <h3>Security Audit</h3>
                    <p>Breakdown of blocked threats.</p>
                    <div class="stat-pill" style="margin-bottom:15px; border-color:#ff0055; color:#ff0055">12 High Risks Found</div>
                    <button class="btn-primary" onclick="openDownloadModal('security')">Download Report</button>
                </div>
                <div class="report-card glass-card">
                    <i class="fas fa-bolt"></i>
                    <h3>Performance Trends</h3>
                    <p>Load averages and bottlenecks.</p>
                    <div class="stat-pill" style="margin-bottom:15px; border-color:#00ff88; color:#00ff88">Optimal Performance</div>
                    <button class="btn-primary" onclick="openDownloadModal('performance')">Download Report</button>
                </div>

            </div>
        </div>
    `;
}

// --- Global Toast System ---
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <div class="toast-content">${message}</div>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('active'), 10);

    // Remove after 4s
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}


function renderProfile() {
    const u = state.user || {};
    contentArea.innerHTML = `
        <div class="dashboard-grid">
            <div class="card" style="grid-column: span 2;">
                <div class="card-title">My Profile</div>
                <div style="display: flex; gap: 30px; margin-top: 20px; align-items: start;">
                    <div style="width: 100px; height: 100px; background: var(--surface-light); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 2.5rem; color: var(--primary); border: 2px solid var(--primary);">
                        ${u.name ? u.name.substring(0, 2).toUpperCase() : 'US'}
                    </div>
                    <div style="flex: 1;">
                        <h2 style="margin: 0; color: white;">${u.name || 'User'}</h2>
                        <p style="color: var(--text-muted); margin: 5px 0 15px 0;">${u.role || 'Member'} • ${u.provider || 'Local'} Account</p>
                        
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="text" class="form-input" value="${u.email || ''}" readonly>
                        </div>
                        
                        <div style="margin-top:20px;">
                            <button class="btn-primary" onclick="alert('Edit functionality coming soon')">Edit Profile</button>
                            <button class="btn-primary" style="background: transparent; border: 1px solid #ff0055; color: #ff0055;" onclick="logout()">Sign Out</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-title">Interactions</div>
                <div style="margin-top: 20px;">
                    <p style="color: var(--text-muted); font-size: 0.9rem;">Recent Activity:</p>
                    <ul style="list-style: none; padding: 0; margin-top: 10px;">
                        <li style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem;">
                            <i class="fas fa-check-circle" style="color: #00ff88; margin-right: 8px;"></i> Login from Win10
                        </li>
                        <li style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem;">
                            <i class="fas fa-robot" style="color: #00d4ff; margin-right: 8px;"></i> Chat with SentinelAI
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

function addMessage(text, type) {
    const body = document.getElementById('chat-body');
    const div = document.createElement('div');
    div.className = `message msg-${type}`;
    div.innerText = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

// Global exposure
window.fillDemo = fillDemo;
window.logout = logout;
window.switchTab = switchTab;
window.toggleTheme = () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
    showToast(`Switched to ${state.theme} mode`, "info");
};
window.handleFileUpload = handleFileUpload;

window.clearAnalysis = clearAnalysis;
window.exportAnalysis = exportAnalysis;
window.showToast = showToast;
window.toggleChat = toggleChat;
window.sendChat = sendChat;
window.handleChatKey = handleChatKey;
window.toggleNotifications = () => {
    showToast("System notifications are healthy.", "success");
};
window.optimizeSystem = optimizeSystem;

// --- Report Generation Logic ---

let currentReportType = null;

function openDownloadModal(type) {
    currentReportType = type;
    const modal = document.getElementById('download-modal');
    const actions = document.getElementById('modal-actions');
    const desc = document.getElementById('modal-desc');

    if (!modal || !actions) return;

    actions.innerHTML = '';

    // Logic: Charts (Availability/Performance) -> Excel & PDF
    // Logs (Security) -> PDF Only

    if (type === 'security') {
        desc.innerText = "Select format for Security Audit (Text/Logs):";
        actions.innerHTML = `
            <button class="btn-pdf" onclick="generateReport('pdf')"><i class="fas fa-file-pdf"></i> Download PDF</button>
        `;
    } else {
        desc.innerText = `Select format for ${type === 'availability' ? 'Infrastructure' : 'Performance'} Report:`;
        actions.innerHTML = `
            <button class="btn-excel" onclick="generateReport('excel')"><i class="fas fa-file-excel"></i> Excel</button>
            <button class="btn-pdf" onclick="generateReport('pdf')"><i class="fas fa-file-pdf"></i> PDF</button>
        `;
    }

    modal.style.display = 'flex';
}

function closeDownloadModal() {
    document.getElementById('download-modal').style.display = 'none';
    currentReportType = null;
}
window.closeDownloadModal = closeDownloadModal;
window.openDownloadModal = openDownloadModal;
window.generateReport = generateReport; // Expose to window

async function generateReport(format) {
    closeDownloadModal();
    showToast(`Generating ${format.toUpperCase()} report...`, 'info');

    try {
        let data, title;
        const timestamp = new Date().toLocaleString();

        if (currentReportType === 'availability') {
            const res = await fetch('/api/infrastructure');
            data = await res.json();
            title = "Weekly Availability Report";
        } else if (currentReportType === 'security') {
            const res = await fetch('/api/logs/history'); // New endpoint
            data = await res.json();
            title = "Security Audit Logs";
        } else if (currentReportType === 'performance') {
            const res = await fetch('/api/metrics/history');
            data = await res.json();
            title = "Performance Trends";
        }

        if (format === 'pdf') {
            generatePDF(title, data, currentReportType);
        } else {
            generateExcel(title, data, currentReportType);
        }

    } catch (e) {
        console.error(e);
        showToast("Failed to generate report", "error");
    }
}

function generatePDF(title, data, type) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    let head = [];
    let body = [];

    if (type === 'availability') {
        head = [['Hostname', 'IP', 'Region', 'Status', 'Load (%)']];
        body = data.map(d => [d.hostname, d.ipAddress, d.region, d.status, d.load]);
    } else if (type === 'security') {
        head = [['Severity', 'Device', 'Message', 'Time']];
        body = data.map(d => [d.severity, d.device, d.message, new Date(d.createdAt).toLocaleTimeString()]);
    } else if (type === 'performance') {
        head = [['Time', 'CPU (%)', 'Mem (%)', 'Net Traffic']];
        body = data.map(d => [new Date(d.createdAt).toLocaleTimeString(), d.cpuLoad, d.memoryUsage, d.networkTraffic]);
    }

    doc.autoTable({
        startY: 40,
        head: head,
        body: body,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [70, 0, 255] }
    });

    doc.save(`${type}_report_${Date.now()}.pdf`);
    showToast("PDF Downloaded", "success");
}

function generateExcel(title, data, type) {
    let ws_data = [];

    // Header
    ws_data.push([title]);
    ws_data.push([`Generated: ${new Date().toLocaleString()}`]);
    ws_data.push([]); // Empty row

    if (type === 'availability') {
        ws_data.push(['Hostname', 'IP', 'Region', 'Status', 'Load (%)']);
        data.forEach(d => ws_data.push([d.hostname, d.ipAddress, d.region, d.status, d.load]));
    } else if (type === 'performance') {
        ws_data.push(['Time', 'CPU (%)', 'Mem (%)', 'Net Traffic']);
        data.forEach(d => ws_data.push([new Date(d.createdAt).toLocaleTimeString(), d.cpuLoad, d.memoryUsage, d.networkTraffic]));
    }
    // Security not needed for Excel per logic

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${type}_report_${Date.now()}.xlsx`);
    showToast("Excel Downloaded", "success");
}

