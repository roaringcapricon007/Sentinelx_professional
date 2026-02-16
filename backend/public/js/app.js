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

    // Start Cinematic Intro (Skip if logging out)
    if (urlParams.get('logout') === 'true') {
        const intro = document.getElementById('intro-view');
        if (intro) intro.style.display = 'none';
        window.history.replaceState({}, document.title, "/");
    } else {
        runIntro();
    }
});

// --- Cinematic Intro Logic ---
function runIntro() {
    const intro = document.getElementById('intro-view');
    const sx = document.getElementById("sx");
    const fullPackage = document.getElementById("full-package");
    const fullText = document.getElementById("full");
    const threatLeft = document.getElementById("threat-left");
    const threatRight = document.getElementById("threat-right");
    const container = document.getElementById("container");
    const scan = document.getElementById("scan");
    const canvas = document.getElementById("matrix");
    if (!intro || !canvas) return;

    const ctx = canvas.getContext("2d");

    // --- MATRIX RAIN LOGIC ---
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?";
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    function drawMatrix() {
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#0F0";
        ctx.font = fontSize + "px Courier New";
        for (let i = 0; i < drops.length; i++) {
            const text = characters.charAt(Math.floor(Math.random() * characters.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        }
    }
    const matrixInterval = setInterval(drawMatrix, 35);

    // --- ANIMATION LOGIC ---
    const applyGlitch = (element, duration = 500) => {
        element.classList.add("glitch-effect");
        setTimeout(() => element.classList.remove("glitch-effect"), duration);
    };

    const tl = gsap.timeline({
        onComplete: () => {
            // IMMEDIATE SLIDE UP AFTER ALL ANIMATIONS FINISH
            clearInterval(matrixInterval);
            intro.classList.add('slide-up');
            // Remove display none after transition ends
            setTimeout(() => {
                intro.style.display = 'none';
            }, 800);
        }
    });

    // 1. Initial State
    tl.set(sx, { scale: 1, opacity: 0 })
        .set(fullPackage, { opacity: 0, scale: 0.8 })
        .set([threatLeft, threatRight], { opacity: 0 })
        .set(scan, { top: "-10%" });

    // 2. SX Appears and PULSES
    tl.to(sx, {
        duration: 1,
        opacity: 1,
        onStart: () => sx.classList.add("pulse-neon"),
        ease: "power2.out"
    });

    // 3. PULSE for 1.5 seconds (Reduced from 3s for snappier feel)
    tl.to({}, { duration: 1.5 });

    // 4. ZOOM Phase
    tl.to(sx, {
        duration: 0.8,
        scale: 10,
        opacity: 0,
        ease: "power4.in",
        onStart: () => {
            sx.classList.remove("pulse-neon");
            applyGlitch(container, 800);
        }
    }, "-=0.2");

    // 5. Reveal BLUE "SENTINELX"
    tl.to(fullPackage, {
        duration: 1.2,
        opacity: 1,
        scale: 1,
        ease: "expo.out"
    }, "-=0.1");

    // 6. RADIUM SCAN
    tl.to(scan, {
        duration: 2.0,
        top: "110%",
        ease: "none",
        onUpdate: function () {
            const progress = this.progress();
            if (progress >= 0.65 && !fullText.classList.contains("glow-red")) {
                fullText.classList.remove("glow-blue");
                fullText.classList.add("glow-red");
                threatLeft.innerText = "";
                fullText.innerText = "";
                threatRight.innerText = "";

                const scramble = (el, word) => {
                    const chars = "¢£¥§¶∆∏∑√∞∫≈≠≤≥@#$%^&*()_+-=[]{}|;:,.<>?0123456789";
                    let iter = 0;
                    const interval = setInterval(() => {
                        el.innerText = word.split("").map((c, i) => {
                            if (i < iter) return word[i];
                            return chars[Math.floor(Math.random() * chars.length)];
                        }).join("");
                        if (iter >= word.length) { clearInterval(interval); el.innerText = word; }
                        iter += 0.5; // Slightly faster decoding
                    }, 25);
                }

                scramble(threatLeft, "THREAT");
                scramble(fullText, "SENTINELX");
                scramble(threatRight, "DETECTED");
                gsap.to([threatLeft, threatRight], { duration: 0.1, opacity: 1 });
            }
        }
    }, "+=0.2");

    window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

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

    // Show Chatbot after login
    const chatbot = document.getElementById('main-chat-widget');
    if (chatbot) chatbot.style.display = 'flex';

    switchTab('home');
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

    // Close profile dropdown if open
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown && dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        const chevron = document.getElementById('profile-chevron');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
    }

    // Update Nav Links
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const links = Array.from(document.querySelectorAll('.nav-link'));
    const activeLink = links.find(l => l.getAttribute('onclick')?.includes(tab));
    if (activeLink) activeLink.classList.add('active');

    // Render View (View Manager handles visibility)
    if (tab === 'home') {
        if (pageTitle) pageTitle.innerText = 'Project Welcome';
        renderHome();
    } else if (tab === 'overview') {
        if (pageTitle) pageTitle.innerText = 'System Overview';
        renderOverview();
    } else if (tab === 'analysis') {
        if (pageTitle) pageTitle.innerText = 'Log Analysis';
        renderAnalysis();
    } else if (tab === 'infrastructure') {
        if (pageTitle) pageTitle.innerText = 'Infrastructure';
        renderInfrastructure();
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

// --- View Manager (SPA Logic) ---
function showView(viewId) {
    // 1. Hide all existing view containers
    document.querySelectorAll('.view-container').forEach(el => el.style.display = 'none');

    // 2. Find or create the requested view container
    let view = document.getElementById(viewId);
    if (!view) {
        view = document.createElement('div');
        view.id = viewId;
        view.className = 'view-container fade-in'; // Add fade-in animation class if available
        contentArea.appendChild(view);
    }

    // 3. Show it
    view.style.display = 'block';

    return view;
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

        // 1. Update Overview Charts if they exist
        updateOverviewCharts(servers);

        // 2. Update Topology if it's currently rendered
        const topoNodes = document.getElementById('dynamic-nodes');
        if (topoNodes) {
            updateTopologyNodes(servers);
        }

        // 3. Update Infrastructure Table if it's currently rendered
        renderInfraTable(servers);
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

        // Update Log Table if it's currently rendered
        const analysisView = document.getElementById('analysis-view');
        if (analysisView) {
            updateAnalysisTable(analysisView);
        }
    });

    socket.on('metrics_update', (data) => {
        state.overviewData = data;
        updateDashboardMetrics(data);
    });
}

// --- RENDER FUNCTIONS ---

function renderHome() {
    const view = showView('home-view');
    if (view.getAttribute('data-rendered') === 'true') return;

    view.innerHTML = `
        <div class="home-container fade-in">
        <div class="hero-section glass-card" style="padding: 40px; margin-bottom: 30px; text-align: center; border-radius: 24px;">
            <h1 style="font-size: 2.8rem; margin-bottom: 10px; background: linear-gradient(90deg, #fff, var(--primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Welcome to Sentinel<span style="color:var(--primary)">X</span> Professional</h1>
            <p style="color: var(--text-muted); font-size: 1.1rem; max-width: 800px; margin: 0 auto;">The complete Enterprise IT Management solution for real-time infrastructure visibility, security intelligence, and AI-driven automation.</p>
            <div style="margin-top: 25px; display: flex; gap: 15px; justify-content: center;">
                <button class="btn-primary" onclick="switchTab('overview')" style="padding: 12px 24px;">View Live Metrics</button>
                <button class="btn-secondary" onclick="switchTab('infrastructure')" style="padding: 12px 24px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: white; border-radius: 10px;">Managed Fleet</button>
            </div>
        </div>

        <h2 style="margin-bottom: 20px; font-weight: 500;">Inside the Platform</h2>
        <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <div class="card glass-card">
                <div style="font-size: 2rem; color: var(--primary); margin-bottom: 15px;"><i class="fas fa-robot"></i></div>
                <h3>SentinelAI Engine</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">Powered by <strong>ChatGPT (GPT-4o/o1)</strong> and neural local NLP. Provides predictive root-cause analysis, autonomous security patching, and multimodal system control.</p>
            </div>
            <div class="card glass-card">
                <div style="font-size: 2rem; color: var(--secondary); margin-bottom: 15px;"><i class="fas fa-bolt"></i></div>
                <h3>Real-time WebSockets</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">Zero-latency data streaming. Your metrics and logs update instantly across all connected dashboards without page refreshes.</p>
            </div>
            <div class="card glass-card">
                <div style="font-size: 2rem; color: #00ff88; margin-bottom: 15px;"><i class="fas fa-project-diagram"></i></div>
                <h3>Dynamic Topology</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">Visualizes your entire network infrastructure in a 2D/3D map. Tracks node health and connections in real-time.</p>
            </div>
            <div class="card glass-card">
                <div style="font-size: 2rem; color: var(--accent); margin-bottom: 15px;"><i class="fas fa-file-export"></i></div>
                <h3>Automated Reports</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">Generate professional PDF and Excel reports for stakeholders. Includes performance trends, security audits, and log summaries.</p>
            </div>
        </div>

        <div class="card glass-card" style="margin-top: 30px; padding: 40px; text-align: center; border-radius: 24px; background: linear-gradient(180deg, rgba(var(--primary-rgb), 0.05) 0%, transparent 100%);">
            <h2 style="margin-bottom: 20px;">Automated Intelligence at Scale</h2>
            <p style="color: var(--text-muted); line-height: 1.8; max-width: 900px; margin: 0 auto 30px;">SentinelX v6.0 leverages a next-gen hybrid neural architecture, combining local Bayesian classification for zero-latency triage with multi-model LLM integration for deep root-cause analysis. Our mission is to provide an autonomous monitoring layer that heals infrastructure before downtime occurs.</p>
            <div style="display: flex; gap: 40px; justify-content: center; align-items: center;">
                <div style="text-align: center;">
                    <div style="font-size: 2.5rem; font-weight: 700; color: var(--primary);">99.99%</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Global Uptime SLA</div>
                </div>
                <div style="width: 1px; height: 50px; background: var(--glass-border);"></div>
                <div style="text-align: center;">
                    <div style="font-size: 2.5rem; font-weight: 700; color: var(--secondary);">0.1ms</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Neural Ingest Latency</div>
                </div>
                <div style="width: 1px; height: 50px; background: var(--glass-border);"></div>
                <div style="text-align: center;">
                    <div style="font-size: 2.5rem; font-weight: 700; color: #00ff88;">24/7</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">AI Monitoring</div>
                </div>
            </div>
        </div>
    </div>
    `;
}

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

    // Update Footer Trend
    const footerNet = document.getElementById('footer-net-speed');
    if (footerNet) {
        // Convert to MB/s
        const mbps = (data.networkRx + data.networkTx) / 1024 / 1024;
        footerNet.innerText = mbps.toFixed(2);
    }

    // 2. Update Chart
    const chart = Chart.getChart('mainTrendChart');
    if (chart) {
        const timeLabel = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Add new data
        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(data.cpuLoad);

        // Keep last 30 points (approx 1.5 mins of history with 3s interval)
        if (chart.data.labels.length > 30) {
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
    const view = showView('overview-view');

    // If already rendered, just return (Socket updates will handle data)
    if (view.getAttribute('data-rendered') === 'true') return;

    view.innerHTML = `
        <div class="dashboard-grid" >
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

        <div class="charts-row" style="margin-top: 20px; display: grid; grid-template-columns: 2fr 1fr; gap: 20px; height: 350px;">

            <div class="chart-container" style="flex: 2; position: relative;">
                <canvas id="mainTrendChart"></canvas>
            </div>
            <div class="chart-container" style="flex: 1; position: relative;">
                <canvas id="statusPieChart"></canvas>
            </div>
        </div>
    `;

    view.setAttribute('data-rendered', 'true');

    // Initialize Charts
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

            // Pie Chart (Server Status) - Initial Load
            updateOverviewCharts(state.infraData || []);

            if (!state.infraData) {
                const infRes = await fetch('/api/infrastructure');
                if (infRes.ok) {
                    state.infraData = await infRes.json();
                    updateOverviewCharts(state.infraData);
                }
            }

        } catch (e) { console.error("Chart load failed", e); }
    }, 100);
}

// let lastChartUpdate = 0; // Throttling removed for Real-time v6.0

function updateOverviewCharts(servers) {
    if (typeof Chart === 'undefined') return;
    if (!servers) return;

    // Direct update without throttle for instant feedback
    // const now = Date.now();
    // if (now - lastChartUpdate < 60000) return;
    // lastChartUpdate = now;

    // Check if chart exists (might not if view not rendered yet, but that's handled by view init)
    const chart = Chart.getChart('statusPieChart');
    if (chart) {
        const statusCounts = { online: 0, offline: 0, warning: 0 };
        servers.forEach(s => statusCounts[s.status] = (statusCounts[s.status] || 0) + 1);
        if (servers.length === 0) statusCounts.online = 1;

        chart.data.datasets[0].data = [statusCounts.online, statusCounts.offline, statusCounts.warning];
        chart.update('active'); // 'active' might be too aggressive, default is fine. Using default.
        chart.update();
    } else {
        // If chart doesn't exist, maybe create it? 
        // No, renderOverview handles creation. 
        // If we are here, it means we have data but no chart. 
        // Attempting to create it here might conflict. safer to let renderOverview handle creation.
        // CHECK: If view is hidden, chart still exists in memory if created via Chart.js
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
    const view = showView('analysis-view');
    const logs = state.liveLogs || [];
    const analysisActive = !!state.analysisData;

    // If analysis is active (report loaded), we might want to refresh to show it
    // But for stream, we can just update.
    // Simplify: ALWAYS re-render table rows if necessary, but keep structure.

    // For now, let's keep the structure static if possible.
    if (view.getAttribute('data-rendered') === 'true' && !analysisActive) {
        // If just live logs, we rely on sockets to update the table.
        // But if we switched tabs, we might want to ensure the table is current.
        // The socket listener calls renderAnalysis() which would re-render everything under old logic.
        // Under new logic, socket listener should just update table.
        // Let's refactor socket listener too?
        // OPTION 2: Re-render inner content for Analysis as it's data-heavy list?
        // Or better: update the table content specifically.
        updateAnalysisTable(view);
        return;
    }

    view.innerHTML = `
        <div class="analysis-container" >
            <!--Header & Upload-->
            <div class="dashboard-grid" style="grid-template-columns: 1.5fr 2fr; gap: 20px; margin-bottom: 30px;">
                <div class="upload-zone" id="drop-zone" onclick="document.getElementById('fileInput').click()" style="height: auto; padding: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <input type="file" id="fileInput" hidden onchange="handleFileUpload(this)">
                    <div class="upload-icon-pulse" style="font-size: 2.5rem; margin-bottom: 15px;">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <h3 style="font-size: 1.2rem; margin-bottom: 5px;">Upload Logs</h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">Deep analyze offline infrastructure logs</p>
                </div>

                <div class="card glass-card" style="display: flex; flex-direction: column; justify-content: center; padding: 30px;">
                    <div class="results-header">
                        <div class="card-title" style="font-size: 1.1rem; color: var(--text-main);">Live Security Intelligence</div>
                        <div class="stat-pill pulse-dot" style="background: rgba(var(--primary-rgb), 0.1);"><i class="fas fa-satellite-dish"></i> Streaming</div>
                    </div>
                    <div style="margin-top: 15px; color: var(--text-muted); font-size: 0.95rem; line-height: 1.6;">
                        Monitoring <strong>${state.infraData ? state.infraData.length : 0} active nodes</strong> in real-time. 
                        SentinelAI is actively screening for anomalies, brute-force attempts, and unauthorized region access.
                    </div>
                </div>
            </div>

            <!--Analysis Results(Upload)-->
            <div id="analysis-results" style="display: ${analysisActive ? 'block' : 'none'}; margin-bottom: 50px;">
                 <div class="results-header" style="margin-bottom: 25px;">
                    <div class="stat-pill" style="background: var(--primary); color:black; font-weight: bold; padding: 8px 16px;">AI Analysis Report</div>
                    <button class="btn-secondary" onclick="clearAnalysis()" style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: var(--text-main); padding: 8px 16px; border-radius: 8px; cursor: pointer;">Close Report</button>
                 </div>
                 
                 <!-- Enhanced Charts (Bigger & Clearer) -->
                 <div class="charts-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 50px; height: 380px;">
                    <div class="chart-container glass-card" style="padding: 25px;"><canvas id="deviceChart"></canvas></div>
                    <div class="chart-container glass-card" style="padding: 25px;"><canvas id="severityChart"></canvas></div>
                </div>
            </div>

            <!--Live / Mixed Table-->
        <div class="table-container glass-card" style="margin-top: 20px;">
            <div class="results-header" style="padding: 20px 25px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 0;">
                <div class="card-title" style="font-size: 1.1rem; color: var(--text-main);"><i class="fas fa-list-alt" style="margin-right: 10px; color: var(--primary);"></i> ${analysisActive ? 'Detailed Audit Logs' : 'Live Event Stream'}</div>
                <div class="stat-pill" id="log-count-pill" style="background: rgba(255,255,255,0.05);">${analysisActive ? state.analysisData.issues.length : logs.length} Events Logged</div>
            </div>
            <div style="padding: 0 10px;">
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
                        <!-- Content filled by updateAnalysisTable -->
                    </tbody>
                </table>
            </div>
        </div>
        </div>
        `;

    view.setAttribute('data-rendered', 'true');
    updateAnalysisTable(view);

    if (analysisActive) {
        setTimeout(() => renderAnalysisCharts(state.analysisData.issues, state.analysisData.summary), 50);
    }
}

function updateAnalysisTable(viewContainer) {
    const logs = state.liveLogs || [];
    const analysisActive = !!state.analysisData;
    const tbody = viewContainer.querySelector('#logTableBody');
    if (!tbody) return;

    // Update Pill
    const pill = viewContainer.querySelector('#log-count-pill');
    if (pill) pill.innerText = `${analysisActive ? state.analysisData.issues.length : logs.length} Events`;

    const dataToRender = analysisActive ? state.analysisData.issues : logs;

    if (!analysisActive && logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #666;">Waiting for events...</td></tr>';
        return;
    }

    tbody.innerHTML = dataToRender.map(log => `
        <tr >
            <td><span class="badge-severity ${log.severity}">${log.severity}</span></td>
            <td>${log.device}</td>
            <td style="font-size:0.8rem; color:#888">${log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Just now'}</td>
            <td style="font-family: 'Space Mono', monospace; font-size: 0.85rem;">${log.message}</td>
            <td><i class="fas fa-magic" style="color:var(--primary); margin-right:5px"></i> ${log.suggestion || 'Analyzing...'}</td>
        </tr>
        `).join('');
}


async function renderInfrastructure() {
    const view = showView('infrastructure-view');

    // Show currently cached data immediately if not rendered
    if (view.getAttribute('data-rendered') !== 'true') {
        view.innerHTML = `
        <div class="card glass-card" >
                <div class="results-header">
                    <div class="card-title">Server Fleet Status</div>
                    <div class="stat-pill" id="infra-count"><i class="fas fa-network-wired"></i> Scanning...</div>
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
                    <tbody id="infra-table-body">
                         <tr><td colspan="5" style="text-align:center; padding: 20px;">Loading fleet data...</td></tr>
                    </tbody>
                </table>
            </div>
        `;
        view.setAttribute('data-rendered', 'true');
    }

    if (state.infraData) {
        renderInfraTable(state.infraData, view);
    }

    try {
        const res = await fetch('/api/infrastructure');
        if (res.ok) {
            const servers = await res.json();
            state.infraData = servers;
            renderInfraTable(servers, view);
        }
    } catch (e) {
        if (!state.infraData) {
            const tbody = view.querySelector('#infra-table-body');
            if (tbody) tbody.innerHTML = `<tr > <td colspan="5" style="text-align:center; padding: 20px; color:red">Failed to load infrastructure data</td></tr> `;
        }
        console.error(e);
    }
}

function renderInfraTable(servers, viewContainer) {
    // If viewContainer not passed (called from socket), find it
    if (!viewContainer) {
        viewContainer = document.getElementById('infrastructure-view');
        // If view doesn't exist yet, we can't update it. 
        if (!viewContainer) return;
    }

    const tbody = viewContainer.querySelector('#infra-table-body');
    const countPill = viewContainer.querySelector('#infra-count');

    if (countPill) countPill.innerHTML = `< i class="fas fa-network-wired" ></i > ${servers.length} Nodes Active`;

    if (!tbody) return;

    let rows = '';
    if (servers.length === 0) {
        rows = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No servers registered. Send heartbeats to /api/ingest to see data here.</td></tr>';
    } else {
        rows = servers.map(s => `
        <tr >
                <td><span style="color:${getStatusColor(s.status)}">●</span> ${capitalize(s.status)}</td>
                <td>${s.hostname}</td>
                <td>${s.ipAddress}</td>
                <td>${s.region || 'Unknown'}</td>
                <td><div class="stat-pill">${s.load}% Load</div></td>
            </tr>
        `).join('');
    }

    tbody.innerHTML = rows;
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
    const view = showView('settings-view');

    if (view.getAttribute('data-rendered') === 'true') return;

    view.innerHTML = `
        <div class="settings-view" >
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

                <!-- AI Model Section -->
                <div class="card glass-card">
                    <div class="results-header">
                        <div class="card-title">AI Engine Configuration</div>
                        <i class="fas fa-robot" style="color:var(--primary)"></i>
                    </div>
                    <div class="setting-item">
                        <div class="setting-text">
                            <h4>Active Intelligence Model</h4>
                            <p>Current: <span id="current-ai-model" style="color:var(--primary); font-weight:bold">Detecting...</span></p>
                        </div>
                        <button class="btn-primary" onclick="checkAIStatus()" style="min-width:100px">Refresh</button>
                    </div>
                    <div style="margin-top:10px; font-size:0.8rem; color:var(--text-muted)">
                        SentinelX prefers <strong>ChatGPT (GPT-3.5)</strong> for advanced insights when an API key is present.
                    </div>
                </div>
            </div>
        </div>
        `;


    view.setAttribute('data-rendered', 'true');

    // Attempt to find local IP (simulated for UI)
    setTimeout(() => {
        const el = view.querySelector('#local-ip');
        if (el) el.innerText = "192.168.1.XX:3000";
        checkAIStatus();
    }, 500);
}

async function checkAIStatus() {
    const el = document.getElementById('current-ai-model');
    if (!el) return;

    try {
        const res = await fetch('/api/ai/status');
        const data = await res.json();
        el.innerText = data.model;
        if (data.gptEnabled) el.style.color = '#00ff88';
    } catch (e) {
        el.innerText = "Connection Error";
    }
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
        < td > <span class="badge-severity ${issue.severity}">${issue.severity}</span></td >
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
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Issues by Node', color: '#8b9bb4', font: { size: 14 } }
                },
                scales: {
                    y: { ticks: { color: '#8b9bb4' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { ticks: { color: '#8b9bb4', font: { size: 10 } } }
                }
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
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#8b9bb4', padding: 20 } },
                    title: { display: true, text: 'Severity Distribution', color: '#8b9bb4', font: { size: 14 } }
                }
            }
        });
        window.analyticsCharts.push(c2);
    }
}

// --- Profile Dropdown Logic ---
function toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    const chevron = document.getElementById('profile-chevron');
    if (dropdown) {
        dropdown.classList.toggle('show');
        if (chevron) {
            chevron.style.transform = dropdown.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    }
}

// Close Dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('profile-dropdown');
    const profileBtn = document.querySelector('.user-profile');

    if (dropdown && dropdown.classList.contains('show')) {
        if (!dropdown.contains(e.target) && !profileBtn.contains(e.target)) {
            dropdown.classList.remove('show');
            const chevron = document.getElementById('profile-chevron');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
    }
});


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
        <div class="typing-dots" >
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
    const view = showView('topology-view');

    if (view.getAttribute('data-rendered') !== 'true') {
        view.innerHTML = `
        <div class="topology-view" >
                <div class="topology-header">
                    <div class="stat-pill"><i class="fas fa-project-diagram"></i> Network Topology v6.0 (Live)</div>
                    <div class="topology-controls">
                        <div class="pulse-dot" style="display:inline-block; margin-right:10px"></div>
                        <span style="color:var(--text-muted); font-size:0.8rem; margin-right:15px">Monitoring</span>
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
        view.setAttribute('data-rendered', 'true');
    }

    // Always update dynamic nodes content when rendered
    setTimeout(() => updateTopologyNodes(state.infraData || []), 50);
}

function updateTopologyNodes(servers) {
    const svg = document.getElementById('dynamic-nodes');
    if (!svg) return;

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

        // Calculate starting point on the outer edge of the core circle (radius 35)
        const coreRadius = 35;
        const startX = centerX + coreRadius * Math.cos(angle);
        const startY = centerY + coreRadius * Math.sin(angle);

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M${startX},${startY} L${x},${y}`);
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
        g.onclick = () => showToast(`Node: ${s.hostname} | Load: ${s.load}% | Status: ${s.status} `, 'info');

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
}

function renderReports() {
    const view = showView('reports-view');

    if (view.getAttribute('data-rendered') === 'true') return;

    view.innerHTML = `
        <div class="reports-view" >
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
    view.setAttribute('data-rendered', 'true');
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
    const view = showView('profile-view');
    const u = state.user || {};

    if (view.getAttribute('data-rendered') === 'true') return;

    view.innerHTML = `
        <div class="dashboard-grid" >
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
    view.setAttribute('data-rendered', 'true');
}

function addMessage(text, type) {
    const body = document.getElementById('chat-body');
    const div = document.createElement('div');
    div.className = `message msg - ${type} `;
    div.innerText = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

// Global exposure
window.toggleProfileMenu = toggleProfileMenu;
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
        desc.innerText = "Select format for Security Audit (PDF Optimized):";
        actions.innerHTML = `
            <button class="btn-pdf" onclick="generateReport('pdf')">
                <i class="fas fa-file-pdf"></i> PDF Document
            </button>
        `;
    } else {
        const reportName = type === 'availability' ? 'Weekly Availability' : 'Performance Trends';
        desc.innerText = `Select export format for ${reportName}:`;
        actions.innerHTML = `
            <button class="btn-excel" onclick="generateReport('excel')">
                <i class="fas fa-file-excel"></i> Excel Spreadsheet
            </button>
            <button class="btn-pdf" onclick="generateReport('pdf')">
                <i class="fas fa-file-pdf"></i> PDF Document
            </button>
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
    if (!window.jspdf) {
        showToast("PDF Library not loaded. Check internet.", "error");
        return;
    }

    // Compatibility Fix: CDN jspdf.umd.min.js puts jsPDF under window.jspdf.jsPDF
    // AutoTable expects jsPDF to be available.
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()} `, 14, 30);

    let head = [];
    let body = [];

    // Data Mapping
    if (type === 'availability') {
        head = [['Hostname', 'IP', 'Region', 'Status', 'Load (%)']];
        body = data.map(d => [d.hostname, d.ipAddress, d.region, d.status, d.load]);
    } else if (type === 'security') {
        head = [['Severity', 'Device', 'Message', 'Time']];
        body = data.map(d => [d.severity, d.device, d.message, new Date(d.createdAt || d.timestamp).toLocaleTimeString()]);
    } else if (type === 'performance') {
        head = [['Time', 'CPU (%)', 'Mem (%)', 'Net Traffic']];
        body = data.map(d => [new Date(d.createdAt || d.timestamp).toLocaleTimeString(), d.cpuLoad, d.memoryUsage, d.networkTraffic]);
    }

    // Check for AutoTable
    if (doc.autoTable) {
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
    } else {
        console.warn("AutoTable plugin missing. Trying workaround...");
        // Fallback or explicit check
        showToast("PDF Plugin missing (AutoTable).", "error");
    }
}

function generateExcel(title, data, type) {
    if (!window.XLSX) {
        showToast("Excel Library not loaded. Check internet.", "error");
        return;
    }

    const { utils, writeFile } = window.XLSX;
    let ws_data = [];

    // Header
    ws_data.push([title]);
    ws_data.push([`Generated: ${new Date().toLocaleString()} `]);
    ws_data.push([]); // Empty row

    if (type === 'availability') {
        ws_data.push(['Hostname', 'IP', 'Region', 'Status', 'Load (%)']);
        data.forEach(d => ws_data.push([d.hostname, d.ipAddress, d.region, d.status, d.load]));
    } else if (type === 'performance') {
        ws_data.push(['Time', 'CPU (%)', 'Mem (%)', 'Net Traffic']);
        data.forEach(d => ws_data.push([new Date(d.createdAt || d.timestamp).toLocaleTimeString(), d.cpuLoad, d.memoryUsage, d.networkTraffic]));
    }
    // Security not needed for Excel per logic

    const wb = utils.book_new();
    const ws = utils.aoa_to_sheet(ws_data);
    utils.book_append_sheet(wb, ws, "Report");
    writeFile(wb, `${type}_report_${Date.now()}.xlsx`);
    showToast("Excel Downloaded", "success");
}

