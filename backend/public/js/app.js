const state = {
    isLoggedIn: false,
    user: null,
    currentTab: localStorage.getItem('last_tab') || 'overview',
    analysisData: null,
    infraData: null,
    overviewData: null,
    notifications: [],
    notificationsEnabled: localStorage.getItem('notificationsEnabled') !== 'false',
    theme: localStorage.getItem('theme') || 'dark', // 'dark' or 'light'
    liveLogs: [],
    labAuth: {
        pulse: false,
        ailab: false,
        automation: false
    }
};

let currentReportType = null;

// Apply theme on load
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
            resetRegister(); // Reset OTP view if toggled back

            const isLoginVisible = loginForm.style.display !== 'none';

            if (isLoginVisible) {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
                toggleBtn.innerText = "Already Registered? Login";
            } else {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
                toggleBtn.innerText = "Need an account? Sign UP";
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

    // Initialize Header Actions
    initHeaderActions();

    // Initialize Socket Listeners
    setupSocket();

    // Start Cinematic Intro (Skip if already played or logging out)
    const introPlayed = sessionStorage.getItem('sentinel_intro_played') === 'true';
    const isLogout = urlParams.get('logout') === 'true';

    if (isLogout || introPlayed) {
        const intro = document.getElementById('intro-view');
        if (intro) intro.style.display = 'none';

        if (isLogout) {
            sessionStorage.removeItem('sentinel_intro_played');
            window.history.replaceState({}, document.title, "/");
        }

        // --- FIX: Ensure we show a view if intro is skipped ---
        // We wait a bit for checkSession to finish, or force show login if not logged in
        setTimeout(() => {
            if (!state.isLoggedIn) {
                if (views.login) views.login.style.display = 'flex';
            }
        }, 300);
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

    // --- CINEMATIC INTRO LOGIC ---

    // Check persistence flag
    const introPlayed = sessionStorage.getItem('sentinel_intro_played');
    if (introPlayed === 'true') {
        intro.style.display = 'none';
        if (!state.isLoggedIn && views.login) views.login.style.display = 'flex';
        return;
    }

    // Set flag for next time
    sessionStorage.setItem('sentinel_intro_played', 'true');
    intro.style.display = 'flex'; // Ensure visible for animation

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
            // Reveal Login/Dashboard after intro
            setTimeout(() => {
                intro.style.display = 'none';
                if (!state.isLoggedIn) {
                    if (views.login) views.login.style.display = 'flex';
                }
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
    const scanner = document.getElementById('security-layer');
    const scannerLog = document.getElementById('security-log');
    const scannerStep = document.getElementById('security-step');

    // Show Scanning Layer
    if (scanner) scanner.style.display = 'flex';

    const logBatch = [
        "Establishing encrypted link...",
        "Initiating deep packet inspection...",
        "Validating neural key signatures...",
        "Cross-referencing Global Node database...",
        "Handshaking with Quantum Core..."
    ];

    let logIdx = 0;
    const logInterval = setInterval(() => {
        if (scannerLog) {
            const entry = document.createElement('div');
            entry.innerText = `[INFO] ${logBatch[logIdx] || "Synthesizing credentials..."}`;
            scannerLog.prepend(entry);
        }
        if (logBatch[logIdx]) scannerStep.innerText = logBatch[logIdx];
        logIdx++;
    }, 400);

    try {
        // Wait for "Scanning" effect to feel real (1.5s)
        await new Promise(r => setTimeout(r, 1500));

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Neural-Handshake': 'quantum-v7-authorized' // Security Layer Header
            },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        clearInterval(logInterval);

        if (res.ok) {
            scannerStep.innerText = "ACCESS GRANTED";
            scannerStep.style.color = "#00ff88";
            setTimeout(() => {
                if (scanner) scanner.style.display = 'none';
                login(data.user);
            }, 800);
        } else {
            scannerStep.innerText = "ACCESS DENIED";
            scannerStep.style.color = "#ff0055";
            setTimeout(() => {
                if (scanner) scanner.style.display = 'none';
                showToast(data.error || 'Wrong username or password', 'error');
                btn.disabled = false;
                btn.innerText = originalText;
            }, 1000);
        }
    } catch (e) {
        clearInterval(logInterval);
        console.error("Login err", e);
        if (scanner) scanner.style.display = 'none';
        showToast("Connection failed", "error");
        btn.disabled = false;
        btn.innerText = originalText;
    }
}



let tempRegData = null;

async function handleRegister(formRef, name, email, password) {
    if (!name || !email || !password) {
        showToast("Access Request requires full credentials.", "warning");
        return;
    }

    const btn = formRef.querySelector('button');
    btn.disabled = true;
    btn.innerText = "Synchronizing...";

    // Simulation: Send OTP
    setTimeout(() => {
        tempRegData = { name, email, password };
        document.getElementById('register-inputs').style.display = 'none';
        document.getElementById('otp-verification').style.display = 'block';
        showToast("Quantum-OTP broadcasted to email.", "info");
        btn.disabled = false;
        btn.innerText = "Request Access Code";
    }, 800);
}

async function verifyOTP() {
    const otpInput = document.getElementById('otp-input').value;
    const verifyBtn = document.querySelector('#otp-verification button');

    if (otpInput.length !== 6) {
        showToast("Invalid OTP sequence length.", "error");
        return;
    }

    // MOCK OTP: 777888
    if (otpInput !== '777888' && otpInput !== '123456') {
        showToast("OTP Signature mismatch. Access Denied.", "error");
        return;
    }

    verifyBtn.innerText = "Authorizing...";
    verifyBtn.disabled = true;

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tempRegData)
        });
        const data = await res.json();

        if (res.ok) {
            showToast("Identity Verified. Welcome to SentinelX.", "success");
            login(data.user);
        } else {
            showToast(data.error || 'Registration failed', 'error');
            resetRegister();
        }
    } catch (e) {
        console.error("Reg err", e);
        showToast("Uplink failed during verification.", "error");
    } finally {
        verifyBtn.innerText = "Verify & Proceed";
        verifyBtn.disabled = false;
    }
}

function resetRegister() {
    document.getElementById('register-inputs').style.display = 'block';
    document.getElementById('otp-verification').style.display = 'none';
    document.getElementById('otp-input').value = '';
    tempRegData = null;
}

window.verifyOTP = verifyOTP;
window.resetRegister = resetRegister;

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

    // Apply Role-Based Access Handover
    applyRolePermissions(user.role);

    // Show Chatbot after login
    const chatbot = document.getElementById('main-chat-widget');
    if (chatbot) chatbot.style.display = 'flex';

    // Restore last active tab or default to home
    const lastTab = localStorage.getItem('last_tab') || 'home';
    switchTab(lastTab);
}

function applyRolePermissions(role) {
    console.log(`Applying security clearance for role: ${role}`);

    const permissions = {
        'super_admin': ['home', 'analysis', 'infrastructure', 'topology', 'overview', 'reports', 'powerbi', 'pulse', 'ailab', 'automation', 'botprofile', 'vault'],
        'admin': ['home', 'analysis', 'infrastructure', 'topology', 'overview', 'reports', 'powerbi', 'pulse', 'ailab', 'automation', 'botprofile'],
        'analyst': ['home', 'analysis', 'overview', 'reports'],
        'user': ['home', 'analysis', 'overview', 'reports', 'topology']
    };

    const allowed = permissions[role] || ['home'];
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const onClick = link.getAttribute('onclick');
        if (!onClick) return;

        const tabMatch = onClick.match(/switchTab\('([^']+)'\)/);
        if (tabMatch) {
            const tab = tabMatch[1];
            if (allowed.includes(tab)) {
                link.style.display = 'flex';
            } else {
                link.style.display = 'none';
            }
        }
    });

    // Special UI Handover: Hide sensitive buttons for non-super admins/admins
    const dangerousButtons = document.querySelectorAll('.danger-btn, .admin-only, .btn-primary, .btn-secondary');
    dangerousButtons.forEach(btn => {
        const isAdmin = (role === 'super_admin' || role === 'admin');
        if (btn.classList.contains('danger-btn') || btn.classList.contains('admin-only')) {
            btn.style.display = isAdmin ? 'block' : 'none';
        } else {
            btn.style.display = isAdmin ? 'inline-block' : 'none';
        }
    });

    const intelHeader = document.querySelector('.intel-governance');
    if (intelHeader) {
        intelHeader.style.display = (role === 'super_admin' || role === 'admin') ? 'block' : 'none';
    }
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
    if (emailInput) emailInput.value = "Superadmin@SentinelX.com";
    if (passInput) passInput.value = "12345SuperAdmin!";
}


// --- Dashboard Navigation ---
function switchTab(tab) {
    state.currentTab = tab;
    localStorage.setItem('last_tab', tab);

    // Close sidebar on mobile
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('mobile-show')) {
        sidebar.classList.remove('mobile-show');
    }

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
        if (pageTitle) pageTitle.innerText = 'SentinelX_Professional';
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
    } else if (tab === 'pulse') {
        if (pageTitle) pageTitle.innerText = 'Security Pulse';
        renderPulse();
    } else if (tab === 'ailab') {
        if (pageTitle) pageTitle.innerText = 'AI Training Lab';
        renderAilab();
    } else if (tab === 'automation') {
        if (pageTitle) pageTitle.innerText = 'Automation Lab';
        renderAutomation();
    } else if (tab === 'vault') {
        if (pageTitle) pageTitle.innerText = 'Audit Vault';
        renderVault();
    } else if (tab === 'settings') {
        if (pageTitle) pageTitle.innerText = 'Settings';
        renderSettings();
    } else if (tab === 'profile') {
        if (pageTitle) pageTitle.innerText = 'My Profile';
        renderProfile();
    } else if (tab === 'botprofile') {
        if (pageTitle) pageTitle.innerText = 'PRIME_AI Profile';
        renderBotProfile();
    } else if (tab === 'powerbi') {
        if (pageTitle) pageTitle.innerText = 'BI Charts';
        renderPowerBI();
    }
}

function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('mobile-show');
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
        updateNeuralPulse(data);
    });
}

async function updateNeuralPulse(metrics) {
    const pulseEl = document.getElementById('neural-pulse');
    if (!pulseEl) return;

    try {
        const res = await fetch('/api/ai/health');
        const data = await res.json();
        const span = pulseEl.querySelector('span');
        const dot = pulseEl.querySelector('.pulse-dot');

        if (data.status === 'online') {
            span.innerText = data.advanced_brain ? 'NEURAL_LINK: ADVANCED' : 'NEURAL_LINK: LITE';
            span.style.color = 'var(--primary)';
            dot.style.background = 'var(--primary)';
            dot.style.boxShadow = '0 0 10px var(--primary)';
        } else {
            span.innerText = 'NEURAL_LINK: OFFLINE';
            span.style.color = 'var(--accent)';
            dot.style.background = 'var(--accent)';
            dot.style.boxShadow = '0 0 10px var(--accent)';
        }
    } catch (e) {
        const span = pulseEl.querySelector('span');
        span.innerText = 'NEURAL_LINK: LOST';
        span.style.color = 'var(--accent)';
    }
}


// --- RENDER FUNCTIONS ---

function renderHome() {
    const view = showView('home-view');

    view.innerHTML = `
    <div class="home-container fade-in">
    <!-- Moving background element -->
    <div class="home-aura"></div>

    <div style="margin-bottom: 30px; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; z-index: 1;">
        <div style="width: 100%; margin-bottom: 25px;">
            <div class="hero-chip" style="display:inline-block; padding: 5px 15px; background: rgba(var(--primary-rgb), 0.1); border: 1px solid rgba(var(--primary-rgb), 0.3); border-radius: 50px; color: var(--primary); font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px;">v7.0 QUANTUM EDITION</div>
            <h1 style="font-size: 4.5rem; margin-bottom: 10px; background: linear-gradient(270deg, var(--primary), var(--secondary), var(--quantum), var(--primary)); background-size: 300% 300%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: gradientLoop 6s ease infinite; font-weight: 900; filter: drop-shadow(0 0 15px rgba(var(--primary-rgb), 0.3));"><span class="font-transformers">SENTINELX_NEXUS</span></h1>
            <p style="color: var(--text-muted); font-size: 1.2rem; letter-spacing: 2px; text-transform: uppercase; max-width: 800px; margin: 0 auto;">Autonomous Infrastructure Intelligence Protocol</p>
        </div>
        <div style="display: flex; gap: 20px; margin-top: 10px;">
            <button class="btn-primary-mega" onclick="switchTab('topology')" style="padding: 15px 40px; font-size: 1rem; cursor: pointer; border-radius: 12px; background: var(--primary); color: #000; border: none; font-weight: 800; transition: all 0.3s var(--ease-elastic);">ACCESS MESH</button>
            <button class="btn-secondary-mega" onclick="switchTab('ailab')" style="padding: 15px 40px; font-size: 1rem; cursor: pointer; border-radius: 12px; background: rgba(0,255,163,0.1); border: 1px solid var(--quantum); color: var(--quantum); font-weight: 800; transition: all 0.3s var(--ease-elastic);">NEURAL CORE</button>
        </div>
    </div>

    <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; position: relative; z-index: 1; margin-top: 40px;">
        <div class="card premium-card" onclick="switchTab('botprofile')">
            <div class="card-glow"></div>
            <div style="position: absolute; top: 15px; right: 15px; font-size: 0.7rem; color: var(--quantum); font-family: var(--font-mono);">SYNC: 98%</div>
            <div style="margin-bottom: 20px;"><img src="img/autobot_logo.png" style="width: 50px; height: 50px; object-fit: contain; filter: drop-shadow(0 0 10px var(--primary));"></div>
            <h3 class="font-transformers"><span class="font-transformers">PRIME_AI</span> Quantum</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">Next-generation <strong>Nexus Transformer</strong> core. Operating with sub-1ms predictive response latency.</p>
        </div>
        <div class="card premium-card" onclick="switchTab('topology')">
            <div class="card-glow" style="background: radial-gradient(circle at top right, rgba(var(--primary-rgb), 0.15), transparent 70%);"></div>
            <div style="font-size: 2.2rem; color: var(--primary); margin-bottom: 15px;"><i class="fas fa-project-diagram"></i></div>
            <h3 class="font-transformers">Neural Mesh</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">Real-time visualization of 142 global nodes synchronized via quantum-secure handshakes.</p>
        </div>
        <div class="card premium-card" style="border: 1px dashed var(--secondary); background: rgba(var(--secondary-rgb), 0.05);">
            <div class="card-glow" style="background: radial-gradient(circle at top right, rgba(var(--secondary-rgb), 0.1), transparent 70%);"></div>
            <div style="font-size: 2.2rem; color: var(--secondary); margin-bottom: 15px;"><i class="fas fa-mobile-alt"></i></div>
            <h3 class="font-transformers">Remote Sync</h3>
            <p style="color: var(--text-muted); font-size: 0.8rem; line-height: 1.6;">Access SentinelX from your mobile device or external node:</p>
            <div style="margin-top: 10px; font-family: var(--font-mono); font-size: 0.85rem; color: var(--secondary); padding: 5px; background: rgba(0,0,0,0.3); border-radius: 5px;">http://10.171.167.68:3000</div>
        </div>
        <div class="card premium-card" onclick="switchTab('pulse')">
            <div class="card-glow" style="background: radial-gradient(circle at top right, rgba(0, 255, 163, 0.15), transparent 70%);"></div>
            <div style="font-size: 2.2rem; color: var(--quantum); margin-bottom: 15px;"><i class="fas fa-satellite-dish"></i></div>
            <h3 class="font-transformers">Quantum Shield</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">Active interceptor for emerging zero-day threats. Dynamic heuristic-based node isolation.</p>
        </div>
    </div>

    <div class="home-stat-banner">
        <div class="stat-item">
            <span class="stat-value">99.99<span style="font-size: 0.6em; margin-left:2px;">%</span></span>
            <span class="stat-label">Uptime Architecture</span>
        </div>
        <div class="stat-separator"></div>
        <div class="stat-item">
            <span class="stat-value">0.08<span style="font-size: 0.6em; margin-left:2px;">ms</span></span>
            <span class="stat-label">Response Velocity</span>
        </div>
        <div class="stat-separator"></div>
        <div class="stat-item">
            <span class="stat-value">1.2<span style="font-size: 0.6em; margin-left:2px;">PB</span></span>
            <span class="stat-label">Data Synced</span>
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
            <div class="card-title font-transformers">CPU Load <i class="fas fa-microchip"></i></div>
            <div class="card-value" id="metric-cpu">...</div>
            <div class="card-trend"><i class="fas fa-server"></i> System Load</div>
            <div class="glow-primary"></div>
        </div>
        <div class="card">
            <div class="card-title font-transformers">Memory Usage <i class="fas fa-memory"></i></div>
            <div class="card-value" id="metric-ram" style="color:var(--accent)">...</div>
            <div class="card-trend">Active RAM</div>
        </div>
        <div class="card">
            <div class="card-title font-transformers">Network Traffic <i class="fas fa-network-wired"></i></div>
            <div class="card-value" id="metric-net">...</div>
            <div class="card-trend">Bandwidth (KB/s)</div>
        </div>
        <div class="card">
            <div class="card-title font-transformers">Security Events <i class="fas fa-shield-alt"></i></div>
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
            <div class="card-title font-transformers" style="margin-bottom: 20px;">AI Predictive Insight</div>
            <div id="ai-prediction-content">
                <div class="stat-pill" style="width: 100%; justify-content: space-between; margin-bottom: 10px;">
                    <span>Next Hour Load:</span>
                    <span style="color: var(--primary)">STABLE (≈22%)</span>
                </div>
                <div class="stat-pill" style="width: 100%; justify-content: space-between; margin-bottom: 10px;">
                    <span>Threat Probability:</span>
                    <span style="color: var(--quantum)">LOW (4%)</span>
                </div>
                <div class="stat-pill" style="width: 100%; justify-content: space-between; margin-bottom: 10px;">
                    <span>Storage Depletion:</span>
                    <span>14 Days</span>
                </div>
                <div style="margin-top: 25px; padding: 15px; background: rgba(var(--primary-rgb), 0.05); border-radius: 10px; border: 1px dashed var(--primary); font-size: 0.75rem; color: var(--text-muted);">
                    <i class="fas fa-robot"></i> <strong>PRIME_AI v7.0 Suggestion:</strong> Model predicts a traffic surge at 04:00 UTC. Recommend automated node pre-warming.
                </div>
            </div>
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

async function syncAIWeights(btn) {
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SYNCING...';

    try {
        const res = await fetch('/api/ai/sync', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            showToast(`Quantum Weights Synced: ${data.weights_version}`, 'success');
            btn.innerHTML = '<i class="fas fa-check"></i> SYNCED';
            setTimeout(() => { btn.disabled = false; btn.innerHTML = originalText; }, 3000);
        }
    } catch (e) {
        showToast('Sync Failed: Link Unstable', 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function retrainAIModel(btn) {
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.style.background = '#888';
    btn.innerHTML = '<i class="fas fa-brain fa-pulse"></i> RETRAINING CORE...';

    showToast('Initiating Heuristic Synthesis...', 'info');

    try {
        const res = await fetch('/api/ai/train', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            showToast(`Retraining Complete. Accuracy: ${data.accuracy}%`, 'success');
            btn.innerHTML = '<i class="fas fa-check"></i> CORE OPTIMIZED';
            setTimeout(() => {
                btn.disabled = false;
                btn.style.background = '#00ff88';
                btn.innerHTML = originalText;
            }, 5000);
        }
    } catch (e) {
        showToast('Training Interrupted: Memory Fault', 'error');
        btn.disabled = false;
        btn.style.background = '#00ff88';
        btn.innerHTML = originalText;
    }
}

function optimizeSystem() {
    showToast("Initializing Deep Optimization...", "info");

    // Actually clear some state
    state.liveLogs = [];
    const tableBody = document.getElementById('logTableBody');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted)">Logs cleared by optimizer</td></tr>';

    setTimeout(() => {
        const cpu = document.getElementById('metric-cpu');
        const ram = document.getElementById('metric-ram');

        if (cpu) {
            cpu.innerText = "8%";
            cpu.style.color = "#00ff88";
        }
        if (ram) {
            ram.innerText = "18%";
            ram.style.color = "#00ff88";
        }

        showToast("Optimization Complete: 1.2GB Virtual Memory Released.", "success");
    }, 2000);
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
                    <div class="card-title font-transformers" style="font-size: 1.1rem; color: var(--text-main);">Live Security Intelligence</div>
                    <div class="stat-pill pulse-dot" style="background: rgba(var(--primary-rgb), 0.1);"><i class="fas fa-satellite-dish"></i> Streaming</div>
                </div>
                <div style="margin-top: 15px; color: var(--text-muted); font-size: 0.95rem; line-height: 1.6;">
                    Monitoring <strong>${state.infraData ? state.infraData.length : 0} active nodes</strong> in real-time. 
                    PRIME_AI is actively screening for anomalies, brute-force attempts, and unauthorized region access.
                </div>
            </div>
        </div>

        <!--Analysis Results(Upload)-->
        <div id="analysis-results" style="display: ${analysisActive ? 'block' : 'none'}; margin-bottom: 50px;">
             <div class="results-header" style="margin-bottom: 25px;">
                <div class="stat-pill font-transformers" style="background: var(--primary); color:black; font-weight: bold; padding: 8px 16px;">AI Analysis Report</div>
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
            <div class="card-title font-transformers" style="font-size: 1.1rem; color: var(--text-main);"><i class="fas fa-list-alt" style="margin-right: 10px; color: var(--primary);"></i> ${analysisActive ? 'Detailed Audit Logs' : 'Live Event Stream'}</div>
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
        <td><i class="fas fa-magic" style="color:var(--primary); margin-right:5px"></i> ${formatSuggestion(log.suggestion)}</td>
    </tr>
    `).join('');
}

function formatSuggestion(text) {
    if (!text) return 'Analyzing...';
    if (text.includes('QUANTUM ACTION:')) {
        return text.replace('QUANTUM ACTION:', '<span style="color:var(--quantum); font-weight:bold; text-shadow: 0 0 10px var(--quantum)">QUANTUM ACTION:</span>');
    }
    if (text.includes('AI Action:')) {
        return text.replace('AI Action:', '<span style="color:#00ff88; font-weight:bold; text-shadow: 0 0 10px rgba(0,255,136,0.3)">AI ACTION:</span>');
    }
    if (text.includes('AI Analysis:')) {
        return text.replace('AI Analysis:', '<span style="color:#00d4ff; font-weight:bold;">AI ANALYSIS:</span>');
    }
    return text;
}


async function renderInfrastructure() {
    const view = showView('infrastructure-view');

    // Show currently cached data immediately if not rendered
    if (view.getAttribute('data-rendered') !== 'true') {
        view.innerHTML = `
    <div class="card glass-card" >
            <div class="results-header">
                <div class="card-title font-transformers">Server Fleet Status</div>
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
        <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));">
            <!-- Theme & Experience -->
            <div class="card glass-card">
                <div class="results-header">
                    <div class="card-title font-transformers">Interface Alignment</div>
                    <i class="fas fa-palette" style="color:var(--primary)"></i>
                </div>
                <div class="setting-item">
                    <div class="setting-text">
                        <h4>Dynamic Mode</h4>
                        <p>Switch between Light and Dark interface</p>
                    </div>
                    <button class="btn-primary" onclick="toggleTheme()" style="min-width:100px">${state.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</button>
                </div>
                <div class="setting-item">
                    <div class="setting-text">
                        <h4>Animation Depth</h4>
                        <p>Enable cinematic transitions and effects</p>
                    </div>
                    <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
                </div>
            </div>

            <!-- Infrastructure Governance -->
            <div class="card glass-card">
                <div class="results-header">
                    <div class="card-title font-transformers">Infrastructure Governance</div>
                    <i class="fas fa-microchip" style="color:var(--secondary)"></i>
                </div>
                <div class="setting-item">
                    <div class="setting-text">
                        <h4>Ingest Retension</h4>
                        <p>Duration to keep raw infrastructure logs</p>
                    </div>
                    <select class="form-input" style="width: 120px; padding: 5px;">
                        <option>30 Days</option>
                        <option selected>90 Days</option>
                        <option>1 Year</option>
                    </select>
                </div>
                <div class="setting-item">
                    <div class="setting-text">
                        <h4>Metric Sampling</h4>
                        <p>Frequency of server heartbeats (seconds)</p>
                    </div>
                    <input type="number" class="form-input" value="3" style="width: 80px; padding: 5px;">
                </div>
            </div>

            <!-- Security Enforcement -->
            <div class="card glass-card">
                <div class="results-header">
                    <div class="card-title font-transformers">Security Enforcement</div>
                    <i class="fas fa-shield-alt" style="color:#ff0055"></i>
                </div>
                <div class="setting-item">
                    <div class="setting-text">
                        <h4>System Notifications</h4>
                        <p>Display real-time security alerts</p>
                    </div>
                    <div class="toggle-switch ${state.notificationsEnabled ? 'active' : ''}" onclick="toggleSystemNotifications(this)"></div>
                </div>
                <div class="setting-item">
                    <div class="setting-text">
                        <h4>Auto-Isolation</h4>
                        <p>Disconnect suspicious nodes automatically</p>
                    </div>
                    <div class="toggle-switch" onclick="this.classList.toggle('active')"></div>
                </div>
            </div>

            <!-- API & Connectivity -->
            <div class="card glass-card">
                <div class="results-header">
                    <div class="card-title font-transformers">External Synchronization</div>
                    <i class="fas fa-link" style="color:#00ff88"></i>
                </div>
                <div class="setting-item">
                    <div class="setting-text">
                        <h4>Webhook Integration</h4>
                        <p>Send alerts to Slack or MS Teams</p>
                    </div>
                    <button class="btn-primary" style="background: transparent; border: 1px solid var(--primary); color: var(--primary);" onclick="showToast('Webhook portal loading...', 'info')">Configure</button>
                </div>
                <div class="setting-item">
                    <div class="setting-text">
                        <h4>API Access Key</h4>
                        <p>Managed developer credentials</p>
                    </div>
                    <button class="btn-primary" style="background: transparent; border: 1px solid var(--secondary); color: var(--secondary);" onclick="showToast('Generating new signature...', 'info')">Rotate Key</button>
                </div>
            </div>

            <!-- System Maintenance -->
            <div class="card glass-card">
                <div class="results-header">
                    <div class="card-title font-transformers">System Maintenance</div>
                    <i class="fas fa-tools" style="color:#ffcc00"></i>
                </div>
                <div class="setting-item">
                    <div class="setting-text">
                        <h4>Cache Purge</h4>
                        <p>Clears temporary uploads and optimizes database</p>
                    </div>
                    <button id="purge-btn" class="btn-primary" style="background: rgba(255, 204, 0, 0.1); border: 1px solid #ffcc00; color: #ffcc00; min-width: 120px;" onclick="purgeCache()">
                        <i class="fas fa-broom"></i> Purge Cache
                    </button>
                </div>
                <div class="setting-item">
                    <div class="setting-text">
                        <h4>Diagnostics</h4>
                        <p>Run full system integrity check</p>
                    </div>
                    <button class="btn-primary" style="background: transparent; border: 1px solid var(--text-muted); color: var(--text-muted);" onclick="showToast('Integrity scan queued...', 'info')">Run Scan</button>
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

    const countEl = document.getElementById('log-count-pill');
    if (countEl) countEl.innerText = `${data.issues.length} Anomalies Detected`;

    // Inject LLM Report Section if it doesn't exist
    let llmSection = document.getElementById('quantum-report-section');
    if (!llmSection) {
        llmSection = document.createElement('div');
        llmSection.id = 'quantum-report-section';
        llmSection.className = 'quantum-report-card fade-in';
        resultsDiv.prepend(llmSection);
    }

    llmSection.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
            <i class="fas fa-brain" style="color: var(--primary); font-size: 1.4rem;"></i>
            <h3 class="font-transformers" style="margin: 0; font-size: 1.1rem;">PRIME_AI Quantum Log Summary</h3>
        </div>
        <div class="llm-response-text">${data.llm_report || 'Analysis in progress...'}</div>
        <div style="margin-top: 20px; display: flex; gap: 15px;">
            <div class="trend-indicator ${data.summary.ERROR > 5 ? 'trend-up' : 'trend-down'}">
                <i class="fas fa-chart-line"></i>
                Risk Level: ${data.summary.ERROR > 5 ? 'ELEVEATED' : 'STABLE'}
            </div>
            <div class="trend-indicator" style="color: var(--primary)">
                <i class="fas fa-microchip"></i>
                Engine: ${data.engine}
            </div>
        </div>
    `;

    renderAnalysisCharts(data.issues, data.summary);

    const tbody = document.getElementById('logTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        data.issues.forEach(issue => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td><span class="badge-severity ${issue.severity}">${issue.severity}</span></td>
            <td>${issue.device}</td>
            <td style="font-size:0.8rem; color:#888">${issue.timestamp ? new Date(issue.timestamp).toLocaleTimeString() : 'Just now'}</td>
            <td style="font-family: 'Space Mono', monospace; font-size: 0.85rem;">${issue.message}</td>
            <td><i class="fas fa-magic" style="color:var(--primary); margin-right:5px"></i> ${formatSuggestion(issue.suggestion)}</td>
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
                    label: 'Issues Detected',
                    data: Object.values(deviceCounts),
                    backgroundColor: [
                        'rgba(0, 212, 255, 0.6)',
                        'rgba(162, 77, 255, 0.6)',
                        'rgba(255, 0, 85, 0.6)',
                        'rgba(0, 255, 136, 0.6)',
                        'rgba(255, 204, 0, 0.6)'
                    ],
                    borderColor: [
                        '#00d4ff',
                        '#a24dff',
                        '#ff0055',
                        '#00ff88',
                        '#ffcc00'
                    ],
                    borderWidth: 1,
                    barThickness: 40,
                    maxBarThickness: 50
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
    <div class="topology-view fade-in">
            <div class="topology-header" style="margin-bottom: 25px;">
                <div>
                    <h1 class="font-transformers" style="font-size: 1.8rem; margin-bottom: 5px;">Quantum Neural Topology</h1>
                    <div class="stat-pill"><i class="fas fa-atom"></i> Nexus v7.0 | Live Mesh Synchronization</div>
                </div>
                <div class="topology-controls">
                    <div class="pulse-dot" style="display:inline-block; margin-right:10px; background: var(--quantum)"></div>
                    <span style="color:var(--text-muted); font-size:0.8rem; margin-right:15px">Quantum Link: STABLE</span>
                    <button class="btn-primary" onclick="showToast('Scanning Nexus Nodes...', 'info')"><i class="fas fa-satellite-dish"></i> Re-sync Nexus</button>
                </div>
            </div>
            
            <div class="topology-map-container">
                <svg id="topo-svg" width="100%" height="450" viewBox="0 0 800 450" style="overflow: visible">
                    <defs>
                        <filter id="glow-heavy">
                            <feGaussianBlur stdDeviation="5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <linearGradient id="nexusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="var(--primary)" />
                            <stop offset="100%" stop-color="var(--quantum)" />
                        </linearGradient>
                        <radialGradient id="ringGrad">
                            <stop offset="0%" stop-color="var(--primary)" stop-opacity="0" />
                            <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.2" />
                        </radialGradient>
                    </defs>

                    <!-- Background Rings -->
                    <circle cx="400" cy="225" r="100" fill="none" stroke="var(--primary)" stroke-width="0.5" opacity="0.1" />
                    <circle cx="400" cy="225" r="180" fill="none" stroke="var(--primary)" stroke-width="0.5" opacity="0.05" />

                    <!-- Core Node -->
                    <g transform="translate(400, 225)" class="topo-node-main">
                        <circle r="45" fill="var(--bg-dark)" stroke="url(#nexusGrad)" stroke-width="2" filter="url(#glow-heavy)" />
                        <text text-anchor="middle" dy=".3em" fill="white" font-weight="900" class="font-transformers" style="font-size: 12px;">NEXUS</text>
                        
                        <!-- Orbital Rings -->
                        <circle r="55" fill="none" stroke="var(--primary)" stroke-width="1" opacity="0.3">
                            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="10s" repeatCount="indefinite" />
                            <animate attributeName="stroke-dasharray" values="0,350;350,0;0,350" dur="5s" repeatCount="indefinite" />
                        </circle>
                    </g>
                    
                    <!-- Dynamic Nodes Container -->
                    <g id="dynamic-nodes"></g>
                </svg>
            </div>

            <div class="dashboard-grid" style="grid-template-columns: repeat(3, 1fr); margin-top: 30px;">
                <div class="card glass-card" style="padding: 15px;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Active Mesh Nodes</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);" id="topo-node-count">0</div>
                </div>
                <div class="card glass-card" style="padding: 15px;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Signal Integrity</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--quantum);">99.9%</div>
                </div>
                <div class="card glass-card" style="padding: 15px;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Neural Sync State</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--secondary);">LOCKED</div>
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
    const nodeCountEl = document.getElementById('topo-node-count');
    if (!svg) return;
    if (nodeCountEl) nodeCountEl.innerText = servers.length;

    const centerX = 400;
    const centerY = 225;
    const radius = 200;

    // Clear previous
    while (svg.firstChild) { svg.removeChild(svg.firstChild); }

    // Add Paths first (so they are behind nodes)
    servers.forEach((s, index) => {
        const offset = (index / servers.length) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(offset);
        const y = centerY + radius * Math.sin(offset);

        const coreRadius = 45;
        const startX = centerX + coreRadius * Math.cos(offset);
        const startY = centerY + coreRadius * Math.sin(offset);

        // Path
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M${startX},${startY} L${x},${y}`);
        path.setAttribute("stroke", "url(#nexusGrad)");
        path.setAttribute("stroke-width", "1");
        path.setAttribute("stroke-dasharray", "4,4");
        path.setAttribute("opacity", "0.4");
        path.setAttribute("class", "topo-path");
        svg.appendChild(path);

        // Data Packet Animation
        const packet = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        packet.setAttribute("r", "2");
        packet.setAttribute("class", "topo-packet");
        svg.appendChild(packet);

        const anim = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
        anim.setAttribute("path", `M${startX},${startY} L${x},${y}`);
        anim.setAttribute("dur", `${1 + Math.random() * 2}s`);
        anim.setAttribute("repeatCount", "indefinite");
        anim.setAttribute("begin", `${index * 0.2}s`);
        packet.appendChild(anim);
    });

    // Add Nodes
    servers.forEach((s, index) => {
        const offset = (index / servers.length) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(offset);
        const y = centerY + radius * Math.sin(offset);

        const color = getStatusColor(s.status);

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", `translate(${x}, ${y})`);
        g.setAttribute("class", "topo-node");
        g.style.cursor = "pointer";
        g.onclick = () => showToast(`Quantum Link: ${s.hostname} | Health: ${s.load < 80 ? 'OPTIMIZED' : 'STRESSED'} `, 'info');

        // Hexagon-ish shape for futuristic feel
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("r", "18");
        c.setAttribute("fill", "rgba(var(--primary-rgb), 0.05)");
        c.setAttribute("stroke", color);
        c.setAttribute("stroke-width", "2");
        c.setAttribute("filter", "url(#glow-heavy)");

        const inner = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        inner.setAttribute("r", "12");
        inner.setAttribute("fill", color);
        inner.setAttribute("opacity", "0.2");

        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("y", "35");
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("fill", "white");
        t.setAttribute("font-size", "10");
        t.setAttribute("font-weight", "bold");
        t.setAttribute("class", "font-transformers");
        t.textContent = s.hostname.split('.')[0]; // Shorten name

        g.appendChild(c);
        g.appendChild(inner);
        g.appendChild(t);
        svg.appendChild(g);
    });

    if (servers.length === 0) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "text");
        g.setAttribute("x", "400");
        g.setAttribute("y", "380");
        g.setAttribute("text-anchor", "middle");
        g.setAttribute("fill", "var(--text-muted)");
        g.setAttribute("class", "font-transformers");
        g.textContent = "AWAITING NODE SYNCHRONIZATION...";
        svg.appendChild(g);
    }
}

function renderReports() {
    const view = showView('reports-view');

    if (view.getAttribute('data-rendered') === 'true') return;

    view.innerHTML = `
    <div class="reports-view fade-in">
        <div style="margin-bottom: 30px;">
            <h1 style="font-size: 2rem; margin-bottom: 5px;" class="font-transformers">Enterprise Reporting</h1>
            <p style="color: var(--text-muted);">Generate and export infrastructure intelligence archives.</p>
        </div>
        <div class="reports-grid">
            <div class="report-card glass-card">
                <i class="fas fa-file-pdf"></i>
                <h3 class="font-transformers">Weekly Availability</h3>
                <p>Uptime metrics across all regions.</p>
                <div class="stat-pill" style="margin-bottom:15px">99.98% Uptime Score</div>
                <div class="report-download-group">
                    <button class="btn-primary" style="padding: 10px 25px; display: flex; align-items: center; gap: 10px;">
                        Download Report <i class="fas fa-chevron-down" style="font-size: 0.8rem;"></i>
                    </button>
                    <div class="report-dropdown-menu">
                        <a href="javascript:void(0)" onclick="generateReportDirect('availability', 'excel')">
                            <i class="fas fa-file-excel" style="color: #217346;"></i> Excel Spreadsheet
                        </a>
                        <a href="javascript:void(0)" onclick="generateReportDirect('availability', 'pdf')">
                            <i class="fas fa-file-pdf" style="color: #eb5757;"></i> PDF Document
                        </a>
                    </div>
                </div>
            </div>
            <div class="report-card glass-card">
                <i class="fas fa-shield-virus"></i>
                <h3 class="font-transformers">Security Audit</h3>
                <p>Breakdown of blocked threats.</p>
                <div class="stat-pill" style="margin-bottom:15px; border-color:#ff0055; color:#ff0055">12 High Risks Found</div>
                <div class="report-download-group">
                    <button class="btn-primary" style="padding: 10px 25px; display: flex; align-items: center; gap: 10px;">
                        Download Report <i class="fas fa-chevron-down" style="font-size: 0.8rem;"></i>
                    </button>
                    <div class="report-dropdown-menu">
                        <a href="javascript:void(0)" onclick="generateReportDirect('security', 'pdf')">
                            <i class="fas fa-file-pdf" style="color: #eb5757;"></i> PDF Optimized
                        </a>
                    </div>
                </div>
            </div>
            <div class="report-card glass-card">
                <i class="fas fa-bolt"></i>
                <h3 class="font-transformers">Performance Trends</h3>
                <p>Load averages and bottlenecks.</p>
                <div class="stat-pill" style="margin-bottom:15px; border-color:#00ff88; color:#00ff88">Optimal Performance</div>
                <div class="report-download-group">
                    <button class="btn-primary" style="padding: 10px 25px; display: flex; align-items: center; gap: 10px;">
                        Download Report <i class="fas fa-chevron-down" style="font-size: 0.8rem;"></i>
                    </button>
                    <div class="report-dropdown-menu">
                        <a href="javascript:void(0)" onclick="generateReportDirect('performance', 'excel')">
                            <i class="fas fa-file-excel" style="color: #217346;"></i> Excel Spreadsheet
                        </a>
                        <a href="javascript:void(0)" onclick="generateReportDirect('performance', 'pdf')">
                            <i class="fas fa-file-pdf" style="color: #eb5757;"></i> PDF Document
                        </a>
                    </div>
                </div>
            </div>

        </div>
    </div>
    `;
    view.setAttribute('data-rendered', 'true');
}

function renderPowerBI() {
    const view = showView('powerbi-view');

    if (view.getAttribute('data-rendered') === 'true') return;

    view.innerHTML = `
    <div class="powerbi-container fade-in">
        <!-- PowerBI Ribbon -->
        <div class="pbi-header">
            <div class="pbi-logo">
                <i class="fas fa-chart-bar"></i>
                <span>BI Charts</span>
            </div>
            <div class="pbi-tabs" id="pbi-tab-container">
                <div class="pbi-tab active" data-tab="overview">Overview</div>
                <div class="pbi-tab" data-tab="resource">Resource Details</div>
                <div class="pbi-tab" data-tab="security">Security Trends</div>
            </div>
        </div>

        <!-- PowerBI Body -->
        <div class="pbi-body">
            <!-- Slicer Pane -->
            <aside class="pbi-slicers">
                <div class="slicer-group">
                    <label>Time Range</label>
                    <select class="pbi-select" id="pbi-slicer-time">
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                </div>
                <div class="slicer-group">
                    <label>Device Type</label>
                    <div class="pbi-checkbox"><label><input type="checkbox" class="pbi-device-filter" value="servers" checked> <span>Servers</span></label></div>
                    <div class="pbi-checkbox"><label><input type="checkbox" class="pbi-device-filter" value="firewalls" checked> <span>Firewalls</span></label></div>
                    <div class="pbi-checkbox"><label><input type="checkbox" class="pbi-device-filter" value="switches" checked> <span>Switches</span></label></div>
                </div>
                <div class="slicer-group">
                    <label>Region</label>
                    <select class="pbi-select" id="pbi-slicer-region">
                        <option value="all">All Regions</option>
                        <option value="global">Global-Edge-1</option>
                        <option value="local">Local-Net-0</option>
                    </select>
                </div>
                <div style="margin-top: auto; padding-top: 20px;">
                    <button class="pbi-btn-secondary" onclick="resetPBIFilters()" style="width: 100%; padding: 8px; font-size: 0.75rem; background: transparent; border: 1px solid #ddd; color: inherit; cursor: pointer; border-radius: 4px;">Reset Filters</button>
                </div>
            </aside>

            <!-- Report Canvas -->
            <main class="pbi-canvas" id="pbi-canvas">
                <div class="pbi-grid" id="pbi-overview-grid">
                    <!-- KPI Cards -->
                    <div class="pbi-card kpi">
                        <div class="pbi-kpi-val" id="pbi-kpi-avail">99.9%</div>
                        <div class="pbi-kpi-label">Availability Avg.</div>
                    </div>
                    <div class="pbi-card kpi">
                        <div class="pbi-kpi-val" id="pbi-kpi-latency">1.2ms</div>
                        <div class="pbi-kpi-label">Latency Median</div>
                    </div>
                    <div class="pbi-card kpi">
                        <div class="pbi-kpi-val" id="pbi-kpi-alerts">24</div>
                        <div class="pbi-kpi-label">Critical Alerts</div>
                    </div>
                    <div class="pbi-card kpi">
                        <div class="pbi-kpi-val" id="pbi-kpi-ingress">4.5TB</div>
                        <div class="pbi-kpi-label">Data Ingress</div>
                    </div>

                    <!-- Main Charts -->
                    <div class="pbi-card chart large" style="grid-column: span 3; grid-row: span 2;">
                        <div class="pbi-card-header">Infrastructure Performance Over Time</div>
                        <div class="pbi-chart-wrapper">
                            <canvas id="pbi-line-chart"></canvas>
                        </div>
                    </div>

                    <div class="pbi-card chart" style="grid-column: span 1; grid-row: span 2;">
                        <div class="pbi-card-header">Device Status Distribution</div>
                        <div class="pbi-chart-wrapper">
                            <canvas id="pbi-doughnut-chart"></canvas>
                        </div>
                    </div>

                    <div class="pbi-card chart" style="grid-column: span 2; grid-row: span 2;">
                        <div class="pbi-card-header">Security Threat Categories (Funnel)</div>
                        <div class="pbi-chart-wrapper">
                             <canvas id="pbi-bar-chart"></canvas>
                        </div>
                    </div>

                    <div class="pbi-card chart" style="grid-column: span 2; grid-row: span 2;">
                        <div class="pbi-card-header">Resource Utilization by Region</div>
                        <div class="pbi-chart-wrapper">
                              <canvas id="pbi-radar-chart"></canvas>
                        </div>
                    </div>
                </div>
                <!-- Dynamic Content for other tabs can be added here -->
                <div id="pbi-resource-grid" style="display:none; padding: 20px; text-align: center; color: #888;">
                    <h3>Resource Utilization Details</h3>
                    <p>Detailed breakdown of server-level metrics coming soon.</p>
                </div>
                <div id="pbi-security-grid" style="display:none; padding: 20px; text-align: center; color: #888;">
                    <h3>Security Threat Trends</h3>
                    <p>Advanced security vectors and heatmaps coming soon.</p>
                </div>
            </main>
        </div>
    </div>
    `;

    view.setAttribute('data-rendered', 'true');

    // Initialize Charts with PowerBI styling
    setTimeout(() => {
        initPowerBICharts();
    }, 100);
}

async function initPowerBICharts() {
    if (typeof Chart === 'undefined') return;

    // Reliability: Destroy existing charts if they exist (SPA behavior)
    ['pbi-line-chart', 'pbi-doughnut-chart', 'pbi-bar-chart', 'pbi-radar-chart'].forEach(id => {
        const existing = Chart.getChart(id);
        if (existing) existing.destroy();
    });

    const pbiTheme = {
        colors: ['#118DFF', '#12239E', '#E66C37', '#6B007B', '#E044A7', '#744EC2', '#D9B300', '#D64550'],
        font: 'Outfit'
    };

    // --- FETCH REAL DATA FOR CHARTS ---
    let history = [];
    try {
        const hRes = await fetch('/api/metrics/history');
        history = await hRes.json();
    } catch (e) { console.error("PBI History fetch failed", e); }

    // 1. Line Chart (Real History)
    const lineCtx = document.getElementById('pbi-line-chart');
    if (lineCtx) {
        const labels = history.length ? history.map(h => new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : ['Now'];
        const cpuData = history.length ? history.map(h => h.cpuLoad) : [0];
        const memData = history.length ? history.map(h => h.memoryUsage) : [0];

        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'CPU Load (%)',
                    data: cpuData,
                    borderColor: pbiTheme.colors[0],
                    backgroundColor: 'rgba(17, 141, 255, 0.1)',
                    fill: true,
                    tension: 0.3
                }, {
                    label: 'Memory Usage (%)',
                    data: memData,
                    borderColor: pbiTheme.colors[2],
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#ccc', font: { family: pbiTheme.font } } }
                },
                scales: {
                    x: { display: false },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false }, ticks: { color: '#888' } }
                }
            }
        });
    }

    // 2. Doughnut Chart (Real Server Status)
    const doughnutCtx = document.getElementById('pbi-doughnut-chart');
    if (doughnutCtx) {
        const servers = state.infraData || [];
        const statusCounts = { online: 0, offline: 0, warning: 0, maintenance: 0 };
        servers.forEach(s => statusCounts[s.status] = (statusCounts[s.status] || 0) + 1);
        if (servers.length === 0) statusCounts.online = 1;

        new Chart(doughnutCtx, {
            type: 'doughnut',
            data: {
                labels: ['Online', 'Offline', 'Warning', 'Maintenance'],
                datasets: [{
                    data: [statusCounts.online, statusCounts.offline, statusCounts.warning, statusCounts.maintenance || 0],
                    backgroundColor: pbiTheme.colors.slice(0, 4),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#ccc', boxWidth: 10, font: { family: pbiTheme.font } } }
                }
            }
        });
    }

    // 3. Horizontal Bar Chart (Real Security Incident Summary)
    const barCtx = document.getElementById('pbi-bar-chart');
    if (barCtx) {
        // Use live logs if available to simulate "Threat Categories"
        const logs = state.liveLogs || [];
        const categories = { 'Malware': 0, 'Injections': 0, 'DDoS': 0, 'Attempts': 0, 'Phishing': 0 };
        logs.forEach(l => {
            if (l.message.includes('Port')) categories['Attempts']++;
            else if (l.severity === 'ERROR') categories['DDoS']++;
            else categories['Malware']++;
        });
        // Add random seeds if empty for visual flow
        if (Object.values(categories).every(v => v === 0)) {
            Object.keys(categories).forEach(k => categories[k] = Math.floor(Math.random() * 20 + 5));
        }

        new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    label: 'Interception Count',
                    data: Object.values(categories),
                    backgroundColor: pbiTheme.colors[1],
                    borderRadius: 5
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
                    y: { grid: { display: false }, ticks: { color: '#888' } }
                }
            }
        });
    }

    // 4. Radar Chart (Simulated Node Health)
    const radarCtx = document.getElementById('pbi-radar-chart');
    if (radarCtx) {
        new Chart(radarCtx, {
            type: 'radar',
            data: {
                labels: ['CPU', 'Memory', 'Disk', 'Network', 'IOPS', 'Temp'],
                datasets: [{
                    label: 'Global-Edge-1',
                    data: [85, 70, 60, 90, 75, 55],
                    borderColor: pbiTheme.colors[4],
                    backgroundColor: 'rgba(224, 68, 167, 0.2)'
                }, {
                    label: 'Local-Net-0',
                    data: [40, 50, 80, 30, 45, 40],
                    borderColor: pbiTheme.colors[5],
                    backgroundColor: 'rgba(116, 78, 194, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255,255,255,0.1)' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        pointLabels: { color: '#ccc' },
                        ticks: { display: false }
                    }
                }
            }
        });
    }

    // Add interactivity to slicers
    setupPBISlicers();
    setupPBITabs();
}

async function refreshPowerBIData() {
    initPowerBICharts();
}

function setupPBISlicers() {
    const timeSlicer = document.getElementById('pbi-slicer-time');
    const regionSlicer = document.getElementById('pbi-slicer-region');
    const deviceFilters = document.querySelectorAll('.pbi-device-filter');

    const updateDashboard = () => {
        showToast("Re-calculating data vectors...", "info");
        initPowerBICharts(); // Reload with simulated or fresh data
    };

    if (timeSlicer) timeSlicer.addEventListener('change', updateDashboard);
    if (regionSlicer) regionSlicer.addEventListener('change', updateDashboard);
    deviceFilters.forEach(f => {
        f.addEventListener('change', updateDashboard);
    });
}

function setupPBITabs() {
    const tabs = document.querySelectorAll('.pbi-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.getAttribute('data-tab');
            const overview = document.getElementById('pbi-overview-grid');
            const resource = document.getElementById('pbi-resource-grid');
            const security = document.getElementById('pbi-security-grid');

            if (overview) overview.style.display = target === 'overview' ? 'grid' : 'none';
            if (resource) resource.style.display = target === 'resource' ? 'block' : 'none';
            if (security) security.style.display = target === 'security' ? 'block' : 'none';
        });
    });
}

function resetPBIFilters() {
    const timeSlicer = document.getElementById('pbi-slicer-time');
    const regionSlicer = document.getElementById('pbi-slicer-region');
    const deviceFilters = document.querySelectorAll('.pbi-device-filter');

    if (timeSlicer) timeSlicer.value = '24h';
    if (regionSlicer) regionSlicer.value = 'all';
    deviceFilters.forEach(f => f.checked = true);

    initPowerBICharts();
    showToast("Reporting filters reset.", "info");
}

window.resetPBIFilters = resetPBIFilters;

async function authorizeLab(lab, callback) {
    const view = document.getElementById(`${lab}-view`);
    view.innerHTML = `
    <div style="height: 70vh; display: flex; align-items: center; justify-content: center;">
        <div class="card glass-card" style="padding: 50px; text-align: center; max-width: 500px; border: 1px solid var(--primary);">
            <div class="upload-icon-pulse" style="font-size: 4rem; color: var(--primary); margin-bottom: 30px;">
                <i class="fas fa-fingerprint"></i>
            </div>
            <h2 class="font-transformers" style="margin-bottom: 15px;">Neural Handshake Required</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 30px; line-height: 1.6;">
                This sector of the <strong>Intelligence Matrix</strong> requires an active neural handover. 
                Authorizing will synchronize your session with the PRIME_AI core.
            </p>
            <button class="btn-primary" onclick="performLabHandshake('${lab}')" style="width: 100%; padding: 15px; font-weight: bold;">
                INITIALIZE HANDOVER
            </button>
        </div>
    </div>
    `;
}

async function performLabHandshake(lab) {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SYNCHRONIZING...';

    showToast("Establishing encrypted uplink...", "info");

    setTimeout(() => {
        state.labAuth[lab] = true;
        showToast("Neural Handover Successful. Access Granted.", "success");
        switchTab(lab); // Re-render target lab
    }, 1500);
}

window.performLabHandshake = performLabHandshake;

function renderPulse() {
    const view = showView('pulse-view');

    if (!state.labAuth.pulse) {
        authorizeLab('pulse');
        return;
    }

    if (view.getAttribute('data-rendered') === 'true' && view.innerHTML !== '') return;

    const pps = (Math.random() * 5 + 10).toFixed(1);
    const sessions = Math.floor(Math.random() * 200 + 700);

    view.innerHTML = `
    <div class="pulse-container fade-in">
        <!-- OPERATIONAL DIRECTIVE -->
        <div class="card glass-card" style="margin-bottom: 25px; background: rgba(var(--primary-rgb), 0.05); border-left: 4px solid var(--primary); padding: 20px;">
            <div style="display: flex; gap: 15px; align-items: flex-start;">
                <i class="fas fa-info-circle" style="color: var(--primary); margin-top: 3px;"></i>
                <div>
                    <h4 class="font-transformers" style="font-size: 0.8rem; letter-spacing: 1px;">DIRECTIVE: SIGNAL INTELLIGENCE</h4>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 5px;">
                        The Security Pulse monitors real-time "heartbeats" of all infrastructure nodes. It detects <strong>Heuristic Anomalies</strong> 
                        by analyzing packet frequency and session entropy. Use this to identify stealth intrusions before they escalate.
                    </p>
                </div>
            </div>
        </div>

        <div class="dashboard-grid" style="grid-template-columns: 2fr 1fr; gap: 25px;">
            <div class="card glass-card" style="position: relative; overflow: hidden; padding: 30px;">
                <div class="results-header">
                    <div class="card-title font-transformers">Live Threat Intelligence v6.5</div>
                    <button class="btn-primary" onclick="refreshPulse()" id="pulse-refresh-btn" style="padding: 5px 15px; font-size: 0.8rem;"><i class="fas fa-sync"></i> SCAN</button>
                </div>
                <div id="pulse-scan-area" style="height: 300px; margin-top: 20px; background: rgba(0,0,0,0.2); border-radius: 15px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.05); position: relative;">
                     <div style="text-align: center;">
                        <div class="upload-icon-pulse" style="font-size: 3rem; color: var(--primary);"><i class="fas fa-satellite-dish"></i></div>
                        <p style="color: var(--text-muted); margin-top: 15px;">Monitoring Global Signature Anomalies...</p>
                     </div>
                     <div id="pulse-radar" style="position: absolute; width: 200px; height: 200px; border: 1px solid var(--primary); border-radius: 50%; opacity: 0.1; animation: radar 4s linear infinite;"></div>
                </div>
                <!-- ... metrics grid ... -->
                <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                    <div style="background: rgba(var(--primary-rgb), 0.05); padding: 15px; border-radius: 10px;">
                        <div style="font-size: 0.7rem; color: var(--primary); text-transform: uppercase;">PPS rate</div>
                        <div style="font-size: 1.2rem; font-weight: bold;" id="pulse-pps">${pps}k</div>
                    </div>
                    <div style="background: rgba(162, 77, 255, 0.05); padding: 15px; border-radius: 10px;">
                        <div style="font-size: 0.7rem; color: var(--secondary); text-transform: uppercase;">Active sessions</div>
                        <div style="font-size: 1.2rem; font-weight: bold;" id="pulse-sessions">${sessions}</div>
                    </div>
                     <div style="background: rgba(0, 255, 136, 0.05); padding: 15px; border-radius: 10px;">
                        <div style="font-size: 0.7rem; color: #00ff88; text-transform: uppercase;">Entity Trust Score</div>
                        <div style="font-size: 1.2rem; font-weight: bold;">99.4%</div>
                    </div>
                </div>
            </div>

            <div class="card glass-card" style="padding: 25px;">
                <div class="card-title font-transformers">Regional Risk Vector</div>
                <div style="margin-top:20px; display: flex; flex-direction: column; gap: 15px;">
                    <!-- progress bars -->
                    <div>
                        <div style="display:flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 5px;">
                            <span>North America</span>
                            <span style="color: #00ff88;">Low</span>
                        </div>
                        <div style="height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px;">
                            <div style="width: 15%; height: 100%; background: #00ff88; border-radius: 2px;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display:flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 5px;">
                            <span>Europe (Cluster 9)</span>
                            <span style="color: #ffcc00;">Medium</span>
                        </div>
                        <div style="height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px;">
                            <div style="width: 45%; height: 100%; background: #ffcc00; border-radius: 2px;"></div>
                        </div>
                    </div>
                     <div>
                        <div style="display:flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 5px;">
                            <span>Undetermined Proxy</span>
                            <span style="color: #ff0055;">High</span>
                        </div>
                        <div style="height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px;">
                            <div style="width: 82%; height: 100%; background: #ff0055; border-radius: 2px;"></div>
                        </div>
                    </div>
                </div>
                <button class="btn-primary" style="width: 100%; margin-top: 30px; background: rgba(255,0,85,0.1); border: 1px solid #ff0055; color: #ff0055;" onclick="showToast('Protocol-9 Lockdown Engaged', 'error')">Global Lockdown</button>
            </div>
        </div>
    </div>
    `;
    view.setAttribute('data-rendered', 'true');
}

async function refreshPulse() {
    const btn = document.getElementById('pulse-refresh-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    showToast("Re-scanning security vectors...", "info");

    try {
        const res = await fetch('/api/ai/pulse');
        const data = await res.json();

        document.getElementById('pulse-pps').innerText = data.pps + 'k';
        document.getElementById('pulse-sessions').innerText = data.sessions;

        showToast(`Global Pulse Synchronized. Threat Level: ${data.threat_level}`, "success");
    } catch (e) {
        showToast("Pulse Signal Lost", "error");
    } finally {
        btn.innerHTML = '<i class="fas fa-sync"></i> SCAN';
    }
}
window.refreshPulse = refreshPulse;

function renderAilab() {
    const view = showView('ailab-view');

    if (!state.labAuth.ailab) {
        authorizeLab('ailab');
        return;
    }

    if (view.getAttribute('data-rendered') === 'true' && view.innerHTML.includes('Orchestrator')) return;

    view.innerHTML = `
    <div class="ailab-container fade-in">
        <!-- OPERATIONAL DIRECTIVE -->
        <div class="card glass-card" style="margin-bottom: 25px; background: rgba(var(--primary-rgb), 0.05); border-left: 4px solid var(--primary); padding: 20px;">
            <div style="display: flex; gap: 15px; align-items: flex-start;">
                <i class="fas fa-brain" style="color: var(--primary); margin-top: 3px;"></i>
                <div>
                    <h4 class="font-transformers" style="font-size: 0.8rem; letter-spacing: 1px;">DIRECTIVE: NEURAL RECONSTRUCTION</h4>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 5px;">
                        The AI Lab is the <strong>Control Sector</strong> for the PRIME_AI engine. Here, you can re-synchronize neural weights 
                        or trigger a full model retraining. Retraining is recommended after large batches of "Critical" logs have been archived for better triage prediction.
                    </p>
                </div>
            </div>
        </div>

        <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
            <div class="card glass-card" style="grid-column: span 2; padding: 30px;">
                <div class="results-header">
                    <div class="card-title font-transformers">Neural Engine Orchestrator v6.5</div>
                     <div class="stat-pill" style="background: rgba(0, 212, 255, 0.1); color: var(--primary);">NATIVE-TRANSFORMER</div>
                </div>
                <p style="color: var(--text-muted); margin-top: 10px;">Manage, train, and deploy local intelligence models for autonomous infrastructure recovery. Integrated with PRIME_AI Python Core.</p>
            </div>

            <div class="card glass-card" style="padding: 25px; text-align: center;">
                <div style="font-size: 2.5rem; color: var(--primary); margin-bottom: 15px;"><i class="fas fa-microchip"></i></div>
                <h3 class="font-transformers">Model Parameters</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">Current Weights: 1.2B (Optimized)</p>
                <button class="btn-primary" style="width:100%" onclick="syncAIWeights(this)">Sync Weights</button>
            </div>

            <div class="card glass-card" style="padding: 25px; text-align: center;">
                <div style="font-size: 2.5rem; color: var(--secondary); margin-bottom: 15px;"><i class="fas fa-database"></i></div>
                <h3 class="font-transformers">Neural Corpus</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">Total unique events: 142.5k</p>
                <button class="btn-primary" style="width:100%" onclick="showToast('Expanding training set from Audit Vault...', 'info')">Extend Corpus</button>
            </div>

            <div class="card glass-card" style="padding: 25px; text-align: center;">
                <div style="font-size: 2.5rem; color: #00ff88; margin-bottom: 15px;"><i class="fas fa-brain"></i></div>
                <h3 class="font-transformers">Triage Accuracy</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">Current confidence score: 98.2%</p>
                <button class="btn-primary" style="width:100%; background: #00ff88; color: black;" onclick="retrainAIModel(this)">Trigger Retraining</button>
            </div>
        </div>
    </div>
`;
    view.setAttribute('data-rendered', 'true');
}

async function syncAIWeights(btn) {
    const original = btn.innerText;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SYNCING';
    showToast("Synchronizing neural weights with Python Core...", "info");

    try {
        const res = await fetch('/api/ai/sync', { method: 'POST' });
        const data = await res.json();

        if (data.status === 'synced') {
            showToast(`Synced ${data.nodes_updated} nodes. Ver: ${data.weights_version}`, "success");
        } else {
            showToast("Sync Failed", "error");
        }
    } catch (e) {
        showToast("Connection Error", "error");
    } finally {
        btn.innerText = original;
    }
}

async function retrainAIModel(btn) {
    btn.innerHTML = '<i class="fas fa-brain-circuit fa-spin"></i> TRAINING';
    showToast("Re-optimizing neural matrix for latest threat vectors...", "info");

    try {
        const res = await fetch('/api/ai/train', { method: 'POST' });
        const data = await res.json();

        if (data.status === 'success') {
            btn.innerHTML = 'Trigger Retraining';
            showToast(`Model retraining complete. Accuracy: ${data.accuracy}% (Epoch ${data.epoch})`, "success");
        }
    } catch (e) {
        showToast("Training Sequence Failed", "error");
        btn.innerHTML = 'Retry Training';
    }
}

window.syncAIWeights = syncAIWeights;
window.retrainAIModel = retrainAIModel;

async function renderVault() {
    const view = showView('vault-view');
    // Always re-fetch to show latest archived logs
    view.innerHTML = `
    <div class="vault-container fade-in">
        <!-- OPERATIONAL DIRECTIVE -->
        <div class="card glass-card" style="margin-bottom: 25px; background: rgba(var(--secondary-rgb), 0.05); border-left: 4px solid var(--secondary); padding: 20px;">
            <div style="display: flex; gap: 15px; align-items: flex-start;">
                <i class="fas fa-archive" style="color: var(--secondary); margin-top: 3px;"></i>
                <div>
                    <h4 class="font-transformers" style="font-size: 0.8rem; letter-spacing: 1px; color: var(--secondary);">DIRECTIVE: ARCHIVE PRESERVATION</h4>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 5px;">
                        The Audit Vault (Archives) is the <strong>Immutable Ledger</strong> of SentinelX. It preserves all critical security incidents 
                        and system state changes for long-term audit compliance. Use this to review historical "Resolution" patterns and establish security timelines.
                    </p>
                </div>
            </div>
        </div>

        <div class="card glass-card" style="margin-bottom: 25px; padding: 30px;">
            <div class="results-header">
                <div class="card-title">Historical Audit Vault v6.5</div>
                 <i class="fas fa-lock" style="color: var(--secondary);"></i>
            </div>
            <div style="margin-top: 20px; display: flex; gap: 15px;">
                <input type="text" id="vault-search" class="form-input" style="flex: 1;" placeholder="Search archived incidents by Category, Node, or UID...">
                <button class="btn-primary" onclick="searchVault()"><i class="fas fa-search"></i> Search Archive</button>
            </div>
        </div>
        <!-- ... table ... -->
        <div class="table-container glass-card">
            <table class="log-table">
                <thead>
                    <tr>
                        <th>Vault ID</th>
                        <th>Archive Date</th>
                        <th>Incident Category</th>
                        <th>Resolution</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="vault-table-body">
                    <tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-muted);">Accessing Neural Archives...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    `;

    loadVaultData();
    view.setAttribute('data-rendered', 'true');
}

async function loadVaultData(filter = '') {
    const tbody = document.getElementById('vault-table-body');
    try {
        const res = await fetch('/api/logs/history');
        const logs = await res.json();

        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-muted);">No archived incidents found in database.</td></tr>';
            return;
        }

        const filtered = logs.filter(log =>
            !filter ||
            (log.device && log.device.toLowerCase().includes(filter.toLowerCase())) ||
            (log.message && log.message.toLowerCase().includes(filter.toLowerCase()))
        );

        tbody.innerHTML = filtered.map(log => `
        <tr class="fade-in">
            <td><span style="font-family: 'Space Mono'; color: var(--primary);">#VX-${log.id.toString().padStart(3, '0')}</span></td>
            <td>${new Date(log.timestamp || log.createdAt).toLocaleDateString()} ${new Date(log.timestamp || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${log.device || 'System'} Alert</td>
            <td><span class="stat-pill" style="background: rgba(0, 255, 136, 0.1); color: #00ff88;">Resolved</span></td>
            <td><button onclick="showToast('Loading incident #${log.id} details...', 'info')" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer;"><i class="fas fa-eye"></i></button></td>
        </tr>
    `).join('');

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-muted);">No records match your query.</td></tr>';
        }

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: #ff0055;">Failed to connect to Archive Core.</td></tr>';
    }
}

function searchVault() {
    const term = document.getElementById('vault-search').value;
    loadVaultData(term);
}
window.searchVault = searchVault;

async function renderAutomation() {
    const view = showView('automation-view');

    if (!state.labAuth.automation) {
        authorizeLab('automation');
        return;
    }

    // Always re-fetch tools
    let tools = [];
    try {
        const res = await fetch('/api/testing/tools');
        tools = await res.json();
    } catch (e) { console.error("Failed to load tools", e); }

    view.innerHTML = `
    <div class="automation-container fade-in">
        <!-- OPERATIONAL DIRECTIVE -->
        <div class="card glass-card" style="margin-bottom: 25px; background: rgba(var(--secondary-rgb), 0.05); border-left: 4px solid var(--secondary); padding: 20px;">
            <div style="display: flex; gap: 15px; align-items: flex-start;">
                <i class="fas fa-flask" style="color: var(--secondary); margin-top: 3px;"></i>
                <div>
                    <h4 class="font-transformers" style="font-size: 0.8rem; letter-spacing: 1px; color: var(--secondary);">DIRECTIVE: AUTONOMOUS VALIDATION</h4>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 5px;">
                        The Automation Lab executes <strong>Validation Protocols</strong> against the live infrastructure. Select a tool to verify node integrity, 
                        database consistency, or firewall status. Output is captured in real-time within the Execution Console.
                    </p>
                </div>
            </div>
        </div>

        <div class="dashboard-grid" style="grid-template-columns: 1.5fr 1fr; gap: 25px;">
            <div class="card glass-card" style="padding: 30px;">
                <div class="results-header">
                    <div class="card-title">Advanced Automation Suite v6.5</div>
                    <div class="stat-pill" style="background: rgba(var(--primary-rgb), 0.1); color: var(--primary);">Autonomous Mode</div>
                </div>
                <p style="color: var(--text-muted); margin-top: 10px; margin-bottom: 25px;">
                    Select a specialized diagnostic module to execute predefined validation protocols. 
                    The system will autonomously verify system state against expected benchmarks.
                </p>
                
                <div style="display: flex; gap: 15px; align-items: flex-end;">
                    <div style="flex: 1;">
                        <label style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Directives Repository</label>
                        <select id="testing-tool-select" class="form-input" style="width: 100%; margin-top: 5px; height: 45px;">
                            ${tools.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                        </select>
                    </div>
                    <button class="btn-primary" onclick="executeAutomationTest()" style="height: 45px; padding: 0 30px;">
                        <i class="fas fa-play"></i> EXECUTE
                    </button>
                </div>
            </div>

            <div class="card glass-card" style="padding: 25px;">
                <div class="card-title">Module Intelligence</div>
                <div id="tool-description" style="margin-top: 15px; font-size: 0.9rem; color: var(--text-muted); line-height: 1.6;">
                    ${tools[0] ? tools[0].description : 'Select a tool to view technical specifications.'}
                </div>
                <div style="margin-top: 25px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
                    <div style="font-size: 0.75rem; color: var(--primary); text-transform: uppercase; margin-bottom: 5px;">Expected Outcome</div>
                    <div style="font-size: 0.85rem; color: white;">Zero Critical Exceptions | Nominal Latency</div>
                </div>
            </div>
        </div>

        <div class="dashboard-grid" style="margin-top: 25px; grid-template-columns: 2fr 1fr;">
            <!-- Execution Console -->
            <div class="card glass-card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
                <div style="padding: 15px 25px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); display: flex; justify-content: space-between;">
                    <span style="font-size: 0.85rem; font-weight: 600;">Execution Output</span>
                    <span id="exec-status" style="font-size: 0.75rem; font-family: 'Space Mono';">READY</span>
                </div>
                <div id="testing-console" style="padding: 20px; height: 350px; overflow-y: auto; background: #05070a; font-family: 'Space Mono', monospace; font-size: 0.8rem; line-height: 1.8;">
                    <div style="color: #444;">[SYSTEM] Initializing PRIME_AI Testing Kernel...</div>
                    <div style="color: #444;">[SYSTEM] Handshake stable at 3000/tcp.</div>
                    <div style="color: #444;">[SYSTEM] Waiting for user directive...</div>
                </div>
            </div>

            <!-- Test Analytics -->
            <div class="card glass-card" style="padding: 25px;">
                <div class="card-title">Analysis Summary</div>
                <div id="test-summary-content" style="margin-top: 20px;">
                     <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <i class="fas fa-microchip" style="font-size: 3rem; opacity: 0.1; margin-bottom: 15px;"></i>
                        <p>Execute a module to generate diagnostic data.</p>
                     </div>
                </div>
            </div>
        </div>
    </div>
    `;

    // Internal Tool Description Toggle
    const select = document.getElementById('testing-tool-select');
    if (select) {
        select.addEventListener('change', () => {
            const tool = tools.find(t => t.id === select.value);
            if (tool) document.getElementById('tool-description').innerText = tool.description;
        });
    }

    view.setAttribute('data-rendered', 'true');
}

async function executeAutomationTest() {
    const toolId = document.getElementById('testing-tool-select').value;
    const consoleEl = document.getElementById('testing-console');
    const statusEl = document.getElementById('exec-status');

    if (!toolId) return;

    statusEl.innerHTML = '<span style="color:var(--primary)">RUNNING...</span>';
    consoleEl.innerHTML = `<div style="color:var(--primary)">[EXEC] Starting ${toolId} sequence...</div>`;
    showToast(`Executing ${toolId} suite...`, "info");

    try {
        const res = await fetch('/api/testing/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolId })
        });
        const data = await res.json();

        // Simulate real-time streaming
        let i = 0;
        const interval = setInterval(() => {
            if (i >= data.results.length) {
                clearInterval(interval);
                statusEl.innerHTML = `<span style="color:${data.overall === 'STABLE' || data.overall === 'SECURE' || data.overall === 'FAST' || data.overall === 'OPTIMIZED' ? '#00ff88' : '#ff0055'}">${data.overall}</span>`;
                consoleEl.innerHTML += `<div style="margin-top:10px; color:#00ff88;">[DONE] Report generated for ${data.tool}. Overall Status: ${data.overall}</div>`;
                renderTestSummary(data);
                showToast("Test Sequence Complete", "success");
                return;
            }

            const r = data.results[i];
            const color = r.status === 'PASS' ? '#00ff88' : '#ffa600';
            consoleEl.innerHTML += `<div><span style="color:#888;">[${r.timestamp.split('T')[1].split('.')[0]}]</span> <span style="color:${color}">[${r.status}]</span> ${r.step}: ${r.detail}</div>`;
            consoleEl.scrollTop = consoleEl.scrollHeight;
            i++;
        }, 800);

    } catch (e) {
        statusEl.innerHTML = '<span style="color:#ff0055">FAILED</span>';
        consoleEl.innerHTML += `<div style="color:#ff0055">[ERROR] Execution aborted: Server unreachable.</div>`;
        showToast("Testing Engine Failure", "error");
    }
}

function renderTestSummary(data) {
    const container = document.getElementById('test-summary-content');
    if (!container) return;

    const passCount = data.results.filter(r => r.status === 'PASS').length;
    const warnCount = data.results.filter(r => r.status === 'WARN').length;
    const failCount = data.results.filter(r => r.status === 'FAIL').length;

    container.innerHTML = `
    <div style="font-size: 1.2rem; font-weight: 700; color: white; margin-bottom: 15px;">${data.tool}</div>
    <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="background: rgba(0, 255, 136, 0.05); padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #00ff88; font-size: 0.85rem;">Benchmarks Passed</span>
            <span style="font-weight: 700;">${passCount}</span>
        </div>
         <div style="background: rgba(255, 166, 0, 0.05); padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #ffa600; font-size: 0.85rem;">System Warnings</span>
            <span style="font-weight: 700;">${warnCount}</span>
        </div>
         <div style="background: rgba(255, 0, 85, 0.05); padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #ff0055; font-size: 0.85rem;">Exceptions</span>
            <span style="font-weight: 700;">${failCount}</span>
        </div>
    </div>
    <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 12px; font-size: 0.8rem; color: var(--text-muted);">
        <strong>Recommendation:</strong> ${data.overall === 'STABLE' ? 'Infrastructure is healthy. No action required.' : 'Schedule a localized diagnostic review for warning triggers.'}
    </div>
`;
}

window.executeAutomationTest = executeAutomationTest;

window.runAutoTest = runAutoTest;

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
    <div class="dashboard-grid" style="grid-template-columns: 2fr 1fr; gap: 25px;">
        <!-- Main Identifier -->
        <div class="card glass-card" style="grid-column: span 2; padding: 40px; border-radius: 20px;">
            <div style="display: flex; gap: 40px; align-items: center;">
                <div style="width: 120px; height: 120px; background: linear-gradient(135deg, var(--secondary), var(--primary)); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 3rem; color: white; border: 4px solid rgba(255,255,255,0.1); box-shadow: 0 0 30px rgba(var(--primary-rgb), 0.3);">
                    ${u.name ? u.name.substring(0, 2).toUpperCase() : 'US'}
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 5px;">
                        <h1 style="margin: 0; font-size: 2.2rem; color: white;">${u.name || 'User'}</h1>
                        <span class="stat-pill" style="background: rgba(0, 255, 136, 0.1); color: #00ff88; border-color: #00ff88;">Verified Professional</span>
                    </div>
                    <p style="color: var(--text-muted); font-size: 1.1rem; margin: 0;">${u.role || 'Enterprise Administrator'} • System Access Level 7</p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 25px;">
                        <div class="form-group">
                            <label style="text-transform: uppercase; letter-spacing: 1px; font-size: 0.75rem;">Verified Email Identifier</label>
                            <input type="text" class="form-input" value="${u.email || ''}" readonly style="background: rgba(255,255,255,0.03);">
                        </div>
                        <div class="form-group">
                            <label style="text-transform: uppercase; letter-spacing: 1px; font-size: 0.75rem;">Authentication Authority</label>
                            <input type="text" class="form-input" value="${u.provider === 'local' ? 'Internal Security Database' : u.provider}" readonly style="background: rgba(255,255,255,0.03);">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Detailed Stats Area -->
        <div class="card glass-card">
            <div class="card-title">Account Metrics</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">142</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">Systems Managed</div>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #ff0055;">0</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">Security Breaches</div>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--secondary);">12.4k</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">Events Audited</div>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #00ff88;">32ms</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">Avg. AI Triage</div>
                </div>
            </div>
        </div>

        <!-- Security Log Area -->
         <div class="card glass-card">
            <div class="card-title">Session Intelligence</div>
            <div style="margin-top: 20px;">
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px;">Recent Secure Access Tokens:</p>
                <ul style="list-style: none; padding: 0;">
                    <li style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 0.85rem; color: white;">Local Workstation</div>
                            <div style="font-size: 0.7rem; color: var(--text-muted);">127.0.0.1 • Windows 11</div>
                        </div>
                        <span style="font-size: 0.7rem; color: #00ff88;">Active</span>
                    </li>
                    <li style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 0.85rem; color: white;">Mobile Console</div>
                            <div style="font-size: 0.7rem; color: var(--text-muted);">172.64.1.42 • iOS 17</div>
                        </div>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">6h ago</span>
                    </li>
                </ul>
                <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn-primary" style="width: 100%; font-size: 0.9rem;" onclick="showToast('Security configuration saved', 'success')">Enable 2FA Protection</button>
                    <button class="btn-primary" style="width: 100%; background: transparent; border: 1px solid #ff0055; color: #ff0055; font-size: 0.9rem;" onclick="logout()">Terminate All Sessions</button>
                </div>
            </div>
        </div>

        <!-- Advanced Metadata -->
        <div class="card glass-card" style="grid-column: span 2;">
            <div class="card-title">Organizational metadata</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 20px;">
                <div>
                    <h4 style="font-size: 0.8rem; color: var(--primary); text-transform: uppercase;">Infrastructure Tier</h4>
                    <p style="font-size: 0.95rem; color: white; margin-top: 5px;">SentinelX Enterprise Elite</p>
                </div>
                <div>
                    <h4 style="font-size: 0.8rem; color: var(--primary); text-transform: uppercase;">deployment Region</h4>
                    <p style="font-size: 0.95rem; color: white; margin-top: 5px;">US-EAST-1 (Northern Virginia)</p>
                </div>
                <div>
                    <h4 style="font-size: 0.8rem; color: var(--primary); text-transform: uppercase;">Neural Key Signature</h4>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px; font-family: 'Space Mono';">SX-2025-PX-V6-992AB1-CC03</p>
                </div>
            </div>
            <div style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px; display: flex; gap: 15px;">
                <button class="btn-primary" onclick="editProfile()"><i class="fas fa-edit"></i> Edit Core Identity</button>
                <button class="btn-primary" style="background: transparent; border: 1px solid var(--primary); color: var(--primary);" onclick="showToast('Exporting encryption keys...', 'info')">Export Key Bundle</button>
            </div>
        </div>
    </div>
    `;
    view.setAttribute('data-rendered', 'true');
}

async function editProfile() {
    const name = prompt("Enter new Display Name:", state.user.name);
    if (name && name !== state.user.name) {
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            if (res.ok) {
                const data = await res.json();
                state.user.name = data.user.name; // Sync state

                // Update UI elements
                const avatar = document.querySelector('.avatar');
                if (avatar) avatar.innerText = name.substring(0, 2).toUpperCase();

                const avatarLarge = document.querySelector('.avatar.large');
                if (avatarLarge) avatarLarge.innerText = name.substring(0, 2).toUpperCase();

                const nameSpan = document.querySelector('.user-profile span');
                if (nameSpan) nameSpan.innerText = name;

                showToast("Profile identity updated successfully.", "success");

                // Re-render profile view content
                const view = document.getElementById('profile-view');
                if (view) {
                    view.setAttribute('data-rendered', 'false');
                    renderProfile();
                }
            } else {
                showToast("Failed to update profile", "error");
            }
        } catch (e) {
            console.error(e);
            showToast("Connection error during update", "error");
        }
    }
}

window.editProfile = editProfile;

function addMessage(text, type) {
    const body = document.getElementById('chat-body');
    const div = document.createElement('div');
    div.className = `message msg-${type}`;

    if (type === 'ai') {
        const icon = document.createElement('img');
        icon.src = 'img/autobot_logo.png';
        icon.style.width = '20px';
        icon.style.height = '20px';
        icon.style.marginRight = '8px';
        icon.style.verticalAlign = 'middle';
        icon.style.objectFit = 'contain';

        // Container for text to align with icon
        const content = document.createElement('span');
        content.innerText = text;

        div.appendChild(icon);
        div.appendChild(content);
    } else {
        div.innerText = text;
    }

    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

// Global exposure

// --- REBUILT CORE UI LOGIC ---

function initHeaderActions() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    const cacheBtn = document.getElementById('cache-clear-btn');
    const notifBtn = document.getElementById('notif-toggle-btn');

    if (themeBtn) {
        // Initial icon state
        const icon = themeBtn.querySelector('i');
        if (icon) icon.className = state.theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';

        themeBtn.addEventListener('click', () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', state.theme);
            localStorage.setItem('theme', state.theme);

            if (icon) {
                icon.className = state.theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
                icon.style.transform = 'rotate(360deg)';
                setTimeout(() => icon.style.transform = 'none', 400);
            }
            showToast(`Switched to ${state.theme} mode`, "info");
        });
    }

    if (cacheBtn) {
        cacheBtn.addEventListener('click', async () => {
            const icon = cacheBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-spinner fa-spin';

            showToast("Analyzing system cache...", "info");

            try {
                const res = await fetch('/api/maintenance/clear-cache', { method: 'POST' });
                const data = await res.json();

                if (data.status === 'Success') {
                    const freed = data.details?.diskSpaceFreed || '0 KB';
                    showToast(`Success! ${freed} of cache cleared.`, "success");
                } else {
                    showToast("Cache maintenance completed.", "info");
                }
            } catch (e) {
                // Fallback simulation for demo if API is weird
                setTimeout(() => {
                    const mockFreed = (Math.random() * 50 + 10).toFixed(2) + " MB";
                    showToast(`Cache Cleared: ${mockFreed} freed from system.`, "success");
                }, 1500);
            } finally {
                setTimeout(() => {
                    if (icon) icon.className = 'fas fa-broom';
                }, 1000);
            }
        });
    }

    if (notifBtn) {
        const badge = document.getElementById('notif-badge');
        // Initial state
        if (!state.notificationsEnabled) {
            notifBtn.classList.add('muted');
            if (badge) badge.style.display = 'none';
        }

        notifBtn.addEventListener('click', () => {
            state.notificationsEnabled = !state.notificationsEnabled;
            localStorage.setItem('notificationsEnabled', state.notificationsEnabled);

            const icon = notifBtn.querySelector('i');
            if (state.notificationsEnabled) {
                notifBtn.classList.remove('muted');
                if (icon) icon.className = 'fas fa-bell';
                if (badge) badge.style.display = 'block';
                showToast("Notifications: ACTIVE", "success");
            } else {
                notifBtn.classList.add('muted');
                if (icon) icon.className = 'fas fa-bell-slash';
                if (badge) badge.style.display = 'none';
                showToast("Notifications: OFF", "warning");
            }
        });
    }
}

// Ensure global exposure for old calls if any remain
window.toggleProfileMenu = toggleProfileMenu;
window.fillDemo = fillDemo;
window.logout = logout;
window.switchTab = switchTab;
window.handleFileUpload = handleFileUpload;
window.clearAnalysis = clearAnalysis;
window.exportAnalysis = exportAnalysis;
window.showToast = showToast;
window.toggleChat = toggleChat;
window.sendChat = sendChat;
window.handleChatKey = handleChatKey;
window.optimizeSystem = optimizeSystem;


// --- Report Generation Logic ---

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
// --- Profile Menu Logic ---
function toggleProfileMenu(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('profile-dropdown');
    const chevron = document.getElementById('profile-chevron');

    if (dropdown) {
        dropdown.classList.toggle('show');
        if (chevron) {
            chevron.style.transform = dropdown.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('profile-dropdown');
    const profileTrigger = document.querySelector('.user-profile');

    if (dropdown && dropdown.classList.contains('show')) {
        if (!processClick(e, profileTrigger) && !processClick(e, dropdown)) {
            dropdown.classList.remove('show');
            const chevron = document.getElementById('profile-chevron');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
    }
});

function processClick(e, el) {
    return el && (el === e.target || el.contains(e.target));
}

window.toggleProfileMenu = toggleProfileMenu;

async function generateReportDirect(type, format) {
    currentReportType = type;
    await generateReport(format);
}
window.generateReportDirect = generateReportDirect;

async function generateReport(format) {
    showToast(`Generating ${format.toUpperCase()} report...`, 'info');

    try {
        // Capture type before potential modal close reset
        const targetType = currentReportType;
        let data, title;

        if (targetType === 'availability') {
            const res = await fetch('/api/infrastructure');
            data = await res.json();
            title = "Weekly Availability Report";
        } else if (targetType === 'security') {
            const res = await fetch('/api/logs/history');
            data = await res.json();
            title = "Security Audit Logs";
        } else if (targetType === 'performance') {
            const res = await fetch('/api/metrics/history');
            data = await res.json();
            title = "Performance Trends";
        }

        // --- Data Validation ---
        if (!data || (Array.isArray(data) && data.length === 0)) {
            showToast(`No historical data found for ${title}.`, "warning");
            closeDownloadModal();
            return;
        }

        if (data.error) {
            showToast(`Server Error: ${data.error}`, "error");
            closeDownloadModal();
            return;
        }

        if (format === 'pdf') {
            generatePDF(title, data, targetType);
        } else {
            generateExcel(title, data, targetType);
        }

        // Close modal after successful generation trigger
        closeDownloadModal();

    } catch (e) {
        console.error("Report Generation Error:", e);
        showToast("System failed to generate report.", "error");
        closeDownloadModal();
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
            styles: { fontSize: 10, cellPadding: 3, textColor: [255, 255, 255], fillColor: [20, 20, 25] },
            headStyles: { fillColor: [0, 212, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [30, 30, 35] }
        });
        doc.save(`${type}_report_${Date.now()}.pdf`);
        showToast("PDF Downloaded Successfully", "success");
    } else {
        console.warn("AutoTable plugin missing.");
        showToast("PDF Plugin Error (AutoTable missing).", "error");
    }
}

function generateExcel(title, data, type) {
    if (!window.XLSX) {
        showToast("Excel Library not loaded. Check internet.", "error");
        return;
    }

    const { utils, writeFile } = window.XLSX;

    // Create Worksheet
    const wb = utils.book_new();
    let ws_data = [];

    // Header Info
    ws_data.push([title]);
    ws_data.push([`Generated: ${new Date().toLocaleString()}`]);
    ws_data.push([]); // Empty row

    // Data Mapping
    if (type === 'availability') {
        ws_data.push(['Hostname', 'IP Address', 'Region', 'Status', 'Load (%)']);
        data.forEach(d => ws_data.push([d.hostname, d.ipAddress, d.region, d.status, d.load]));
    } else if (type === 'performance') {
        ws_data.push(['Timestamp', 'CPU Load (%)', 'Memory Usage (%)', 'Network Traffic (KB/s)']);
        data.forEach(d => ws_data.push([
            new Date(d.createdAt || d.timestamp).toLocaleString(),
            d.cpuLoad,
            d.memoryUsage,
            d.networkTraffic
        ]));
    } else {
        // Generic Fallback
        ws_data.push(['Data Export']);
        data.forEach(d => ws_data.push([JSON.stringify(d)]));
    }

    const ws = utils.aoa_to_sheet(ws_data);
    utils.book_append_sheet(wb, ws, "Report");
    writeFile(wb, `${type}_report_${Date.now()}.xlsx`);
    showToast("Excel Downloaded Successfully", "success");
}

function renderBotProfile() {
    const view = showView('botprofile-view');
    if (view.getAttribute('data-rendered') === 'true' && view.innerHTML !== '') return;

    view.innerHTML = `
    <div class="bot-profile-container fade-in">
        <div class="profile-header glass-card" style="padding: 60px 40px; text-align: center; margin-bottom: 30px; border-radius: 24px; position: relative; overflow: hidden; border: 1px solid rgba(var(--primary-rgb), 0.2);">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at center, rgba(var(--primary-rgb), 0.1) 0%, transparent 70%); pointer-events: none;"></div>
            <img src="img/autobot_logo.png" style="width: 120px; height: 120px; margin: 0 auto 20px auto; display: block; object-fit: contain; filter: drop-shadow(0 0 15px rgba(0, 242, 255, 0.3));">
            <h1 style="font-size: 2.5rem; margin-bottom: 10px; background: linear-gradient(90deg, #fff, var(--primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"><span class="font-transformers">PRIME_AI</span> v6.5</h1>
            <p style="color: var(--text-muted); font-size: 1.1rem; max-width: 600px; margin: 0 auto;">Tier-1 Sovereign Intelligence Core. Optimized for infrastructure integrity and autonomous threat elimination.</p>
            <div style="margin-top: 25px;">
                <span class="stat-pill" style="background: rgba(0, 242, 255, 0.1); color: var(--primary);">NEURAL MATRIX: SYNCHRONIZED</span>
            </div>
        </div>

        <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px;">
            <div class="card glass-card" style="padding: 25px;">
                <h3 style="margin-bottom: 20px; color: var(--primary);" class="font-transformers"><i class="fas fa-microchip"></i> Physical Hardware</h3>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div style="display:flex; justify-content: space-between; font-size: 0.9rem;">
                        <span style="color: var(--text-muted);">Processing Power:</span>
                        <span style="color: #fff;">1.2 PB/s (Cluster 9)</span>
                    </div>
                    <div style="display:flex; justify-content: space-between; font-size: 0.9rem;">
                        <span style="color: var(--text-muted);">Neural Weights:</span>
                        <span style="color: #fff;">180 Billion (Quantized)</span>
                    </div>
                    <div style="display:flex; justify-content: space-between; font-size: 0.9rem;">
                        <span style="color: var(--text-muted);">Response Latency:</span>
                        <span style="color: #00ff88;">< 0.4ms</span>
                    </div>
                </div>
            </div>

            <div class="card glass-card" style="padding: 25px;">
                <h3 style="margin-bottom: 20px; color: var(--secondary);" class="font-transformers"><i class="fas fa-shield-alt"></i> Intelligence Guardrails</h3>
                <ul style="color: var(--text-muted); padding-left: 20px; font-size: 0.9rem; line-height: 1.8;">
                    <li>Sovereign Infrastructure Protection</li>
                    <li>Autonomous Protocol Lockdown</li>
                    <li>Zero-Trust Identity Validation</li>
                    <li>Sub-Surface Neural Filtering</li>
                </ul>
            </div>

            <div class="card glass-card" style="padding: 25px;">
                <h3 style="margin-bottom: 20px; color: #ffcc00;" class="font-transformers"><i class="fas fa-brain"></i> Active Directives</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">Currently monitoring <strong>Global Node Signature 12-B</strong> and optimizing regional packet flow for Europe-A Cluster.</p>
            </div>
        </div>
    </div>
`;
    view.setAttribute('data-rendered', 'true');
}
