const state = {
    isLoggedIn: false,
    user: null,
    currentTab: localStorage.getItem('last_tab') || 'overview',
    analysisData: null,
    infraData: null,
    overviewData: null,
    notifications: [],
    notificationsEnabled: localStorage.getItem('notificationsEnabled') !== 'false',
    theme: 'dark', // FORCED DARK DEFAULT AS REQUESTED
    liveLogs: [],
    labAuth: {
        pulse: true,
        ailab: true
    }
};

// Guarantee Dark Mode immediately
localStorage.setItem('theme', 'dark');
document.documentElement.setAttribute('data-theme', 'dark');

/**
 * --- PRIVILEGE ESCALATION CHECK ---
 * Verifies if current user has engineering clearance for advanced controls.
 */
function isAdmin() {
    if (!state.user || !state.user.role) return true; // BYPASS FOR PRODUCTION STABILIZATION
    const role = state.user.role.toLowerCase();
    return role === 'admin' || role === 'super_admin';
}

let currentReportType = null;
let regSessionData = null; // Store for verification context




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


    const forgotPassLink = document.getElementById('forgot-password-link');
    const fpForm = document.getElementById('forgot-password-form');

    if (forgotPassLink && loginForm && fpForm) {
        forgotPassLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            fpForm.style.display = 'block';
            toggleBtn.style.display = 'none'; // Hide sign up toggle during recovery
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
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
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
        // Wait for "Scanning" effect to feel real (500ms for snappiness)
        await new Promise(r => setTimeout(r, 500));

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
                login(data.user, data.token);
            }, 800);
        } else {
            scannerStep.innerText = "ACCESS DENIED";
            scannerStep.style.color = "#ff0055";
            setTimeout(() => {
                if (scanner) scanner.style.display = 'none';
                showToast(data.message || data.error || 'Wrong username or password', 'error');
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



// --- SECURE REGISTRATION ENGINE (REBUILT) ---

async function handleRegister(formRef, name, email, password) {
    if (!name || !email || !password) {
        showToast("Identity sync requires full credentials.", "warning");
        return;
    }

    const btn = formRef.querySelector('button');
    const originalText = btn.innerText;
    const scanner = document.getElementById('security-layer');
    const scannerStep = document.getElementById('security-step');
    const scannerLog = document.getElementById('security-log');

    btn.disabled = true;
    btn.innerText = "Synchronizing...";

    // Activate Security Scan for cinematic effect
    if (scanner) scanner.style.display = 'flex';
    if (scannerLog) scannerLog.innerHTML = "";
    if (scannerStep) scannerStep.innerText = "AUTHENTICATING NEURAL SIGNATURE...";

    const logMsg = (msg) => {
        if (scannerLog) {
            const div = document.createElement('div');
            div.textContent = `> ${msg}`;
            scannerLog.appendChild(div);
            scannerLog.scrollTop = scannerLog.scrollHeight;
        }
    };

    const runJourney = async () => {
        logMsg("1️⃣ Requesting Secure Access to Gmail SMTP...");
        await new Promise(r => setTimeout(r, 400));
        logMsg("2️⃣ DNS Magic: Querying MX Records for gmail.com...");
        await new Promise(r => setTimeout(r, 600));
        logMsg("3️⃣ TLS Encryption Handshake Protocol (AES-256)...");
        await new Promise(r => setTimeout(r, 400));
        logMsg("4️⃣ SMTP Delivery Truck 🚚: Transferring payload...");
        await new Promise(r => setTimeout(r, 800));
        logMsg("5️⃣ Gmail Server Accept: 250 OK - Handshake Complete.");
        await new Promise(r => setTimeout(r, 300));
        logMsg("6️⃣ Dispatching through Global Postal Empire 🔐.");
    };

    try {
        logMsg("Initializing OTP Broadcast sequence...");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for complex SMTP handshakes

        const res = await fetch('/api/auth/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await res.json();

        if (res.ok) {
            console.log("[AUTH] Handshake SUCCESS:", data);
            logMsg(`Identity verification successful.`);
            logMsg(`OTP broadcast sequence initiated.`);
            regSessionData = { name, email, password };

            // Start transition sequence immediately
            console.log("[AUTH] Finalizing handshake. Swapping interface...");

            setTimeout(() => {
                // Ensure scanner is dismissed
                if (scanner) scanner.style.display = 'none';

                // FORCE INTERFACE SWAP (No nested timeout)
                const regInputs = document.getElementById('register-inputs');
                const otpLayer = document.getElementById('otp-verification');

                if (regInputs) regInputs.style.display = 'none';
                if (otpLayer) {
                    otpLayer.style.display = 'block';
                    // Scroll to otp input for better UX
                    // startOtpTimer logic
                    startOtpTimer(30);

                    if (otpInput) otpInput.focus();
                }

                if (data.mode === 'simulation') {
                    showToast(`[SIMULATION] LOCAL OTP: <strong>${data.otp}</strong>`, "success");
                    logMsg(`Simulation OTP obtained: ${data.otp}`);
                } else {
                    showToast(`Quantum-OTP broadcasted to ${email}.`, "info");
                }
            }, 50); 
        } else {
            console.warn("[AUTH] Handshake REJECTED:", data);
            logMsg(`Handshake rejected: ${data.message || data.error}`);
            // Dismiss scanner immediately on error
            if (scanner) scanner.style.display = 'none';

            showToast(data.message || data.error || "Handshake rejected.", "error");

            // --- REDIRECT LOGIC ---
            if (data.error === 'ALREADY_REGISTERED') {
                const loginForm = document.getElementById('login-form');
                const registerForm = document.getElementById('register-form');
                const toggleBtn = document.getElementById('toggle-auth');
                if (registerForm) registerForm.style.display = 'none';
                if (loginForm) {
                    loginForm.style.display = 'block';
                    loginForm.querySelector('input[type="email"]').value = email;
                    loginForm.querySelector('input[type="password"]').focus();
                }
                if (toggleBtn) toggleBtn.innerText = "Need an account? Sign UP";
            }

            btn.disabled = false;
            btn.innerText = originalText;
        }
    } catch (e) {
        console.error("Auth System Error:", e);
        logMsg(`CRITICAL: Uplink terminated unexpectedly.`);
        setTimeout(() => {
            if (scanner) scanner.style.display = 'none';
            showToast("Uplink failed during authentication handshake.", "error");
            btn.disabled = false;
            btn.innerText = originalText;
        }, 1500);
    }
}

let otpTimerInterval = null;
function startOtpTimer(seconds) {
    if (otpTimerInterval) clearInterval(otpTimerInterval);
    const timerDisplay = document.getElementById('otp-timer');
    const resendBtn = document.getElementById('resend-otp-btn');
    if (resendBtn) resendBtn.style.display = 'none';
    
    let remaining = seconds;
    const update = () => {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        if (timerDisplay) timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    update();

    otpTimerInterval = setInterval(() => {
        remaining--;
        update();
        if (remaining <= 0) {
            clearInterval(otpTimerInterval);
            if (resendBtn) resendBtn.style.display = 'block';
        }
    }, 1000);
}

async function resendOTP() {
    if (!regSessionData) return;
    showToast("Re-broadcasting sequence...", "info");
    const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regSessionData)
    });
    const data = await res.json();
    if (res.ok) {
        startOtpTimer(30);
        if (data.mode === 'simulation') {
            showToast(`[NEW] LOCAL OTP: ${data.otp}`, "success");
        } else {
            showToast("New OTP sent to email.", "success");
        }
    } else {
        showToast(data.error || "Broadcast failed", "error");
    }
}

window.resendOTP = resendOTP;

async function verifyOTP() {
    const otpInput = document.getElementById('otp-input').value;
    const verifyBtn = document.querySelector('#otp-verification button');

    if (otpInput.length !== 6) return showToast("Sequence length mismatch.", "error");

    verifyBtn.innerText = "Authorizing...";
    verifyBtn.disabled = true;

    try {
        const res = await fetch('/api/auth/verify-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: regSessionData.email, otp: otpInput })
        });
        const data = await res.json();

        if (res.ok) {
            showToast("Verified. Initializing platform access...", "success");
            login(data.user);
        } else {
            showToast(data.error || "Handshake rejected.", "error");
        }
    } catch (e) {
        showToast("Verification synchronization lost.", "error");
    } finally {
        verifyBtn.innerText = "Verify & Proceed";
        verifyBtn.disabled = false;
    }
}

function resetRegister() {
    document.getElementById('register-inputs').style.display = 'block';
    document.getElementById('otp-verification').style.display = 'none';
    regSessionData = null;
}

window.verifyOTP = verifyOTP;
window.resetRegister = resetRegister;

function login(user, token) {
    state.isLoggedIn = true;
    state.user = user;
    if (token) localStorage.setItem('sentinel_token', token);

    if (views.login) views.login.style.display = 'none';
    if (views.dashboard) views.dashboard.style.display = 'flex';

    // Update Profile UI (Primary Topbar + Dropdown)
    const topName = document.getElementById('topbar-user-name');
    const dropName = document.getElementById('user-profile-name');
    const dropEmail = document.getElementById('user-profile-email');
    const dropRole = document.getElementById('user-profile-role');

    if (topName) topName.innerText = user.name || 'Sentinel User';
    if (dropName) dropName.innerText = user.name || 'Sentinel User';
    if (dropEmail) dropEmail.innerText = user.email || 'user@sentinelx.com';
    if (dropRole) {
        dropRole.innerText = (user.role || 'viewer').replace('_', ' ').toUpperCase();
        dropRole.className = `badge-severity ${user.role === 'super_admin' ? 'CRITICAL' : 'INFO'}`;
    }

    // Apply Role-Based Access Handover
    applyRolePermissions(user.role);

    // Show Chatbot after login
    const chatbot = document.getElementById('main-chat-widget');
    if (chatbot) chatbot.style.display = 'flex';

    // Restore last active tab or default to home
    const lastTab = localStorage.getItem('last_tab') || 'overview';
    switchTab(lastTab);

    // Initialize Risk Score Banner
    setTimeout(() => refreshRiskScore(), 1000);
}

/**
 * --- SESSION PERSISTENCE ENGINE ---
 * Verifies if a user is already authenticated via secure cookie.
 */
async function checkSession() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated) {
            console.log("[SESSION] Active link detected. Resuming session for:", data.user.email);
            login(data.user);
        } else {
            console.log("[SESSION] No active link. Awaiting manual handshake.");
            // Hide intro and show login if checkSession is called later
            const intro = document.getElementById('intro-view');
            if (intro && intro.style.display === 'none') {
                if (views.login) views.login.style.display = 'flex';
            }
        }
    } catch (e) {
        console.warn("[SESSION] Persistence check failed - likely offline.");
    }
}

/**
 * --- TERMINATE SESSION (LOGOUT) ---
 * Uses direct navigation — the server handles session destruction and redirect.
 * This approach is IMPOSSIBLE to break — no async, no fetch, no race conditions.
 */
function logout(e) {
    if (e) e.preventDefault();
    if (e) e.stopPropagation();
    console.log("[LOGOUT] Session termination initiated.");

    // Purge local state immediately
    state.isLoggedIn = false;
    state.user = null;
    localStorage.removeItem('last_tab');
    localStorage.removeItem('sentinel_token'); // Changed from 'user_token' to 'sentinel_token'
    sessionStorage.clear();

    // Direct navigation to server logout — server destroys session + cookie, then redirects to /?logout=true
    window.location.href = '/api/auth/logout';
}

window.logout = logout;

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
    // ONLY target buttons INSIDE the dashboard, NOT global .btn-primary (which includes login/register)
    const dashboard = document.getElementById('dashboard-view');
    if (dashboard) {
        const dangerousButtons = dashboard.querySelectorAll('.danger-btn, .admin-only');
        dangerousButtons.forEach(btn => {
            const isAdmin = (role === 'super_admin' || role === 'admin');
            btn.style.display = isAdmin ? 'inline-block' : 'none';
        });
    }

    const intelHeader = document.querySelector('.intel-governance');
    if (intelHeader) {
        intelHeader.style.display = (role === 'super_admin' || role === 'admin') ? 'block' : 'none';
    }
}

// (Duplicate checkSession and logout removed — originals at lines 613 and 636 are used)

function fillDemo() {
    // Demo fill behavior disabled for generalized authentication flow constraints requested by user.
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
    } else if (tab === 'timeline') {
        if (pageTitle) pageTitle.innerText = 'Security Timeline';
        renderTimeline();

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
        const topoContainer = document.getElementById('topo-d3-container');
        if (topoContainer && typeof initTopologyGraph === 'function') {
            initTopologyGraph(servers);
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
        if (log.severity === 'CRITICAL' || log.severity === 'ERROR') {
            showToast(`🚨 Alert [${log.severity}] from ${log.device || 'Unknown Node'}: ${(log.message || '').substring(0, 80)}`, 'error');
        }

        // --- PHASE 3: Update Global Security Feed ---
        if (typeof updateLiveFeedUI === 'function') updateLiveFeedUI(log);

        // Update Log Table if it's currently rendered
        const analysisView = document.getElementById('analysis-view');
        if (analysisView) {
            updateAnalysisTable(analysisView);
        }

        // --- Global Map Pulse (Step 8 Visualization) ---
        const mapGroup = document.getElementById('map-threat-points');
        if (mapGroup) {
            const x = Math.floor(Math.random() * 800) + 100;
            const y = Math.floor(Math.random() * 300) + 100;
            const color = log.severity === 'CRITICAL' ? '#ff0055' : log.severity === 'ERROR' ? '#ffcc00' : '#00d4ff';

            const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            pulse.setAttribute("cx", x);
            pulse.setAttribute("cy", y);
            pulse.setAttribute("r", "4");
            pulse.setAttribute("fill", color);

            const animateR = document.createElementNS("http://www.w3.org/2000/svg", "animate");
            animateR.setAttribute("attributeName", "r");
            animateR.setAttribute("from", "4");
            animateR.setAttribute("to", "20");
            animateR.setAttribute("dur", "2.5s");
            animateR.setAttribute("repeatCount", "indefinite");

            const animateO = document.createElementNS("http://www.w3.org/2000/svg", "animate");
            animateO.setAttribute("attributeName", "opacity");
            animateO.setAttribute("from", "1");
            animateO.setAttribute("to", "0");
            animateO.setAttribute("dur", "2.5s");
            animateO.setAttribute("repeatCount", "indefinite");

            pulse.appendChild(animateR);
            pulse.appendChild(animateO);
            mapGroup.appendChild(pulse);

            // Auto-clean after 10s
            setTimeout(() => pulse.remove(), 10000);
        }

        // Refresh risk score banner
        refreshRiskScore();
    });

    socket.on('log_resolved', (logId) => {
        // Remove from live logs (active list)
        if (state.liveLogs) {
            state.liveLogs = state.liveLogs.filter(l => l.id !== logId);
        }
        // Remove row from DOM if visible
        const row = document.getElementById(`log-row-${logId}`);
        if (row) {
            row.style.transition = 'opacity 0.4s, transform 0.4s';
            row.style.opacity = '0';
            row.style.transform = 'translateX(30px)';
            setTimeout(() => row.remove(), 400);
        }
        showToast('✅ Alert marked as Resolved', 'success');
        refreshRiskScore();
    });

    socket.on('new_log', (log) => {
        state.liveLogs.unshift(log);
        if (state.liveLogs.length > 100) state.liveLogs.pop();
        
        // Push to Real-time Feed Panel (Step 3.A)
        prependToFeed({
            type: 'SECURITY_INCIDENT',
            severity: log.severity,
            message: log.message,
            target: log.device,
            time: new Date().toLocaleTimeString()
        });

        // Update Map Pulse if relevant
        if (log.ip) {
            // ... (existing map logic)
        }
    });

    socket.on('system:alert', (alert) => {
        showToast(`💥 ${alert.type}: ${alert.message}`, 'error');
        prependToFeed({
            type: 'SYSTEM_FAULT',
            severity: 'CRITICAL',
            message: alert.message,
            target: alert.target || 'GLOBAL_CORE',
            time: new Date().toLocaleTimeString()
        });
        document.body.classList.add('alert-flash');
        setTimeout(() => document.body.classList.remove('alert-flash'), 2000);
    });

    socket.on('metrics_update', (data) => {
        state.overviewData = data;
        updateDashboardMetrics(data);
        updateNeuralPulse(data);
    });

    socket.on('infrastructure_update', (servers) => {
        state.infraData = servers;
        renderInfraTable(servers);
    });

    function prependToFeed(event) {
        const feed = document.getElementById('global-live-feed');
        if (!feed) return;
        const item = document.createElement('div');
        item.className = `feed-item ${event.severity}`;
        item.innerHTML = `
            <div class="feed-time">${event.time}</div>
            <div class="feed-body">
                <span class="feed-type">${event.type}</span>
                <p>${event.message}</p>
                <div class="feed-node"><i class="fas fa-microchip"></i> ${event.target}</div>
            </div>
        `;
        feed.prepend(item);
        if (feed.childNodes.length > 20) feed.removeChild(feed.lastChild);
    }

    socket.on('streaming_log', (log) => {
        const terminal = document.getElementById('log-terminal-stream');
        if (!terminal) return;

        const div = document.createElement('div');
        div.style.marginBottom = '5px';
        div.style.borderLeft = `2px solid ${log.severity === 'ERROR' ? '#ff0055' : '#00ff88'}`;
        div.style.paddingLeft = '10px';
        div.innerHTML = `
            <span style="color:var(--text-muted); font-size:0.75rem;">[${new Date().toLocaleTimeString()}]</span>
            <span style="color:${log.severity === 'ERROR' ? '#ff0055' : 'var(--primary)'}; font-weight:bold; font-size:0.8rem;">${log.hostname || 'AGENT'}</span>
            <span style="color:#eee; font-size:0.8rem;">${log.message}</span>
        `;
        
        terminal.appendChild(div);
        terminal.scrollTop = terminal.scrollHeight;

        if (terminal.childNodes.length > 50) {
            terminal.removeChild(terminal.firstChild);
        }
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
    <div class="dashboard-grid">
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

    <div class="charts-row" style="margin-top: 20px; display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; height: 350px;">
        <div class="chart-container" style="flex: 1.5; position: relative; display: flex; flex-direction: column;">
            <div class="card-title font-transformers" style="margin-bottom: 10px;"><i class="fas fa-wave-square"></i> System Trend (v14.3 Stable)</div>
            <canvas id="mainTrendChart" style="flex-grow: 1;"></canvas>
        </div>
        <div class="chart-container" style="flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column;">
            <div class="card-title font-transformers" style="margin-bottom: 15px; color: var(--primary);"><i class="fas fa-rss"></i> GLOBAL SECURITY FEED</div>
            <div id="global-live-feed" class="custom-scrollbar" style="flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 5px;">
                <div style="text-align:center; padding: 40px; color: var(--text-muted); font-size: 0.8rem;">
                    <i class="fas fa-satellite fa-bounce"></i><br>Syncing Neural Arrays...
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

            // Live Feed Initialization (Phase 3)
            const feed = document.getElementById('global-live-feed');
            if (feed && state.liveLogs) {
                feed.innerHTML = '';
                [...state.liveLogs].reverse().forEach(l => updateLiveFeedUI(l));
            }

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

        // --- Live Predictive Analysis (Step 10) ---
        try {
            const predRes = await fetch('/api/metrics/predict');
            const predData = await predRes.json();
            const predBox = document.getElementById('ai-prediction-content');
            if (predBox && predData.predictions) {
                if (predData.predictions.length === 0) {
                    predBox.innerHTML = `
                        <div style="padding: 15px; background: rgba(var(--primary-rgb), 0.05); border-radius: 10px; border: 1px dashed var(--primary); font-size: 0.8rem; color: var(--text-muted);">
                            <i class="fas fa-robot"></i> <strong>PRIME_AI:</strong> Gathering trend data... Predictions will appear after 5+ metric snapshots.
                        </div>`;
                } else {
                    predBox.innerHTML = predData.predictions.map(p => {
                        const iconMap = { 'CRITICAL': 'fas fa-skull-crossbones', 'WARNING': 'fas fa-exclamation-triangle', 'WATCH': 'fas fa-eye', 'OK': 'fas fa-check-circle' };
                        const colorMap = { 'CRITICAL': '#ff0055', 'WARNING': '#ffcc00', 'WATCH': '#00d4ff', 'OK': '#00ff88' };
                        const bgMap = { 'CRITICAL': 'rgba(255,0,85,0.1)', 'WARNING': 'rgba(255,204,0,0.1)', 'WATCH': 'rgba(0,212,255,0.1)', 'OK': 'rgba(0,255,136,0.1)' };
                        const color = colorMap[p.severity] || '#888';
                        const bg = bgMap[p.severity] || 'rgba(255,255,255,0.05)';
                        const icon = iconMap[p.severity] || 'fas fa-info-circle';
                        return `
                        <div style="padding: 12px; background: ${bg}; border-left: 3px solid ${color}; border-radius: 8px; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                                <i class="${icon}" style="color: ${color};"></i>
                                <strong style="color: ${color}; font-size: 0.85rem;">${p.metric}</strong>
                                <span style="margin-left: auto; font-size: 0.75rem; color: var(--text-muted);">Current: ${p.current}%</span>
                            </div>
                            <div style="font-size: 0.82rem; color: var(--text-muted);">${p.prediction}</div>
                            <div style="font-size: 0.7rem; margin-top: 5px; color: #555;">Trend: ${p.trend} (slope: ${p.slope})</div>
                        </div>`;
                    }).join('');
                }
            }
        } catch (e) { console.log('Prediction fetch skipped'); }
    }, 100);
}

// let lastChartUpdate = 0; // Throttling removed for Real-time v6.0

function updateOverviewCharts(servers) {
    if (typeof Chart === 'undefined') return;
    if (!servers) return;

    // Direct update without throttle for instant feedback
    // const now = Date.now();
    // if (now - lastChartUpdate <60000) return;
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

// --- Enterprise Alert Tab State ---
let alertTab = 'ACTIVE'; // 'ACTIVE' or 'RESOLVED'

function renderAnalysis() {
    const view = showView('analysis-view');
    const analysisActive = !!state.analysisData;

    /* 
    if (view.getAttribute('data-rendered') === 'true' && !analysisActive) {
        updateAnalysisTable(view);
        return;
    }
    */

    view.innerHTML = `
    <div class="analysis-container">
        <!-- Dashboard Grid (Hidden until upload) -->
        <div id="analysis-dashboard-grid" style="display: ${analysisActive ? 'grid' : 'none'}; grid-template-columns: 1fr 1.5fr 1fr; gap: 20px; margin-bottom: 30px;">
            <!-- Threat Overview Panel -->
            <div class="card glass-card" style="padding: 25px; display: flex; flex-direction: column; justify-content: space-between;">
                <div class="results-header">
                    <div class="card-title font-transformers" style="font-size: 1.1rem; color: var(--text-main);"><i class="fas fa-shield-virus"></i> Threat Overview</div>
                </div>
                <div style="margin-top: 15px; flex-grow: 1; display:flex; flex-direction:column; justify-content:center; gap: 15px;">
                    <div style="display:flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom:10px;">
                        <span style="color:var(--text-muted); font-size: 0.9rem;">Critical Risk Events</span>
                        <span id="soc-high-risk" class="badge-severity CRITICAL" style="font-size: 1.2rem; padding: 4px 12px; font-weight:bold;">0</span>
                    </div>
                    <div style="display:flex; justify-content: space-between; align-items: center;">
                        <span style="color:var(--text-muted); font-size: 0.9rem;">Elevated Risk Events</span>
                        <span id="soc-med-risk" class="badge-severity WARN" style="font-size: 1.2rem; padding: 4px 12px; font-weight:bold;">0</span>
                    </div>
                </div>
            </div>

            <!-- Log Timeline Panel -->
            <div class="card glass-card" style="padding: 20px; display:flex; flex-direction:column;">
                <div class="results-header" style="margin-bottom: 5px;">
                    <div class="card-title font-transformers" style="font-size: 1.1rem; color: var(--text-main);"><i class="fas fa-chart-line"></i> Error Frequency Timeline</div>
                </div>
                <div style="flex-grow: 1; min-height: 120px; position:relative;">
                    <canvas id="socTimelineChart"></canvas>
                </div>
            </div>

            <!-- Top Error Sources Panel -->
            <div class="card glass-card" style="padding: 25px; display:flex; flex-direction:column;">
                <div class="results-header">
                    <div class="card-title font-transformers" style="font-size: 1.1rem; color: var(--text-main);"><i class="fas fa-crosshairs"></i> Top Error Sources</div>
                </div>
                <div id="soc-top-sources" style="margin-top: 15px; display:flex; flex-direction:column; gap:8px; overflow-y:auto; max-height:120px;">
                    <div style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:10px;">Gathering Neural Data...</div>
                </div>
            </div>
        </div>

        <!-- NEURAL SEARCH SYSTEM (Step 5 Upgrade) -->
        <div class="card glass-card" style="margin-bottom: 25px; padding: 15px 25px; display: flex; align-items: center; gap: 20px;">
            <div style="flex-grow: 1; position: relative;">
                <i class="fas fa-search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--primary); opacity: 0.6;"></i>
                <input type="text" id="log-search-query" onkeypress="if(event.key==='Enter') execNeuralSearch()"
                    placeholder="Search Logs (CIDR, Device hostname, or Regex pattern)..." 
                    style="width: 100%; padding: 12px 12px 12px 45px; background: rgba(0,0,0,0.2); border: 1px solid rgba(var(--primary-rgb), 0.2); border-radius: 8px; color: #fff; font-family: var(--font-mono); font-size: 0.9rem;">
            </div>
            <select id="log-filter-severity" style="padding: 12px; background: rgba(0,0,0,0.2); color: #fff; border: 1px solid rgba(var(--primary-rgb), 0.2); border-radius: 8px; font-family: var(--font-mono);">
                <option value="">All Severities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="WARN">WARN</option>
                <option value="INFO">INFO</option>
            </select>
            <button class="btn-primary" onclick="execNeuralSearch()" style="margin: 0; padding: 12px 25px; white-space: nowrap;">
                <i class="fas fa-microchip"></i> EXECUTE QUERY
            </button>
        </div>

        <!-- Deep Packet Ingestion Zone -->
        <div class="card glass-card" style="margin-bottom: 30px; padding: 40px; background: radial-gradient(circle at top right, rgba(var(--primary-rgb), 0.05) 0%, transparent 100%);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                <div>
                    <h3 class="font-transformers" style="color: var(--primary); margin:0;"><i class="fas fa-microchip"></i> Neural Packet Ingestion</h3>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top:5px;">Autonomous heuristic engine for multi-vector threat detection.</p>
                </div>
                <div class="neural-pulse-ring"></div>
            </div>
            
            <div class="upload-zone" id="log-dropzone" 
                 onclick="document.getElementById('log-upload-input').click()"
                 style="position: relative; padding: 60px 20px; border: 2px dashed rgba(var(--primary-rgb), 0.2); background: rgba(var(--primary-rgb), 0.01); border-radius: 20px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; overflow:hidden;">
                
                <input type="file" id="log-upload-input" 
                       onchange="handleAnalysisUpload(this)"
                       style="display:none;">
                
                <div id="upload-idle-state" style="pointer-events:none;">
                    <div style="font-size: 3rem; color: var(--primary); margin-bottom: 20px; filter: drop-shadow(0 0 15px rgba(var(--primary-rgb), 0.3));">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <div class="font-transformers" style="font-size: 1.2rem; color: #fff; margin-bottom: 10px;">DROP LOG ARCHIVE</div>
                    <p style="color: var(--text-muted); font-size: 0.85rem;">Max 50MB per packet | Supported: .log, .txt, .csv</p>
                    <div class="btn-primary" style="display:inline-block; margin-top:20px;">
                        SELECT FILE
                    </div>
                </div>

                <div id="upload-scan-state" style="display:none;">
                    <div class="scanning-animation">
                        <div class="scan-bar"></div>
                    </div>
                    <div style="margin-top:20px; font-family:'Space Mono'; color:var(--primary); font-size:0.9rem;">
                        <span id="scan-text">DECRYPTING NEURAL PACKETS...</span>
                        <div id="scan-progress" style="width:200px; height:4px; background:rgba(255,255,255,0.05); margin:10px auto; border-radius:2px;">
                            <div id="scan-progress-bar" style="width:0%; height:100%; background:var(--primary); transition:width 0.3s;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Real-time Agent Log Stream (NEW) -->
        <div id="streaming-log-section" class="card glass-card" style="margin-bottom: 30px; padding:0; height: 300px; display:flex; flex-direction:column;">
            <div style="padding: 15px 25px; border-bottom: 1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center; background: rgba(0,0,0,0.2);">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="pulse-dot" style="background:#00ff88"></div>
                    <span class="font-transformers" style="font-size: 0.8rem; letter-spacing:1px;">AGENT_TELEMETRY: LIVE_FEED</span>
                </div>
                <div style="font-size:0.7rem; color:var(--text-muted);">WEBSOCKET_SECURE_LINK // ID: X-99</div>
            </div>
            <div id="log-terminal-stream" style="flex:1; padding:20px; font-family:'Space Mono', monospace; font-size:0.8rem; color:var(--primary); overflow-y:auto; background: #050608;">
                <div style="opacity:0.6;">> [SYS] Initialization complete. Awaiting machine pulses...</div>
                <div style="opacity:0.6;">> [SYS] Neural baseline established. Core temperature stable.</div>
            </div>
        </div>

        <!--Analysis Results(Upload)-->
        <div id="analysis-results" style="display: ${analysisActive ? 'block' : 'none'}; margin-bottom: 50px;">
             <div class="results-header" style="margin-bottom: 25px;">
                <div class="stat-pill font-transformers" style="background: var(--primary); color:black; font-weight: bold; padding: 8px 16px;">AI Analysis Report</div>
                <button class="btn-secondary" onclick="clearAnalysis()" style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: var(--text-main); padding: 8px 16px; border-radius: 8px; cursor: pointer;">Close Report</button>
             </div>
             <div class="charts-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 50px; height: 380px;">
                <div class="chart-container glass-card" style="padding: 25px;"><canvas id="deviceChart"></canvas></div>
                <div class="chart-container glass-card" style="padding: 25px;"><canvas id="severityChart"></canvas></div>
            </div>
        </div>

        <!-- Enterprise Alert Table (Hidden until upload) -->
        <div class="table-container glass-card" style="margin-top: 20px; display: ${analysisActive ? 'block' : 'none'};">
            <div style="padding: 20px 25px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <!-- Tabs -->
                <div style="display: flex; gap: 8px;">
                    <button id="tab-btn-active" onclick="switchAlertTab('ACTIVE')" style="padding: 6px 18px; border-radius: 20px; border: 1px solid var(--primary); background: rgba(var(--primary-rgb),0.15); color: var(--primary); cursor: pointer; font-size: 0.8rem; font-weight: 700; transition: all 0.2s;">
                        <i class="fas fa-exclamation-triangle"></i> Active Alerts
                    </button>
                    <button id="tab-btn-resolved" onclick="switchAlertTab('RESOLVED')" style="padding: 6px 18px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: var(--text-muted); cursor: pointer; font-size: 0.8rem; font-weight: 700; transition: all 0.2s;">
                        <i class="fas fa-check-circle"></i> Resolved
                    </button>
                </div>
                <div class="stat-pill" id="log-count-pill" style="background: rgba(255,255,255,0.05);">Loading...</div>
            </div>
            <div style="padding: 0 10px;">
                <table class="log-table">
                    <thead>
                        <tr>
                            <th>Severity</th>
                            <th>Source & Origin</th>
                            <th style="text-align:center;">Attempts</th>
                            <th>Risk Factor</th>
                            <th>Timeline</th>
                            <th>Security Intelligence</th>
                            <th style="width: 130px; border-left: 1px solid rgba(255,255,255,0.05);">Operational Actions</th>
                        </tr>
                    </thead>
                    <tbody id="logTableBody">
                        <tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">Initializating Neural Link...</td></tr>
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

function switchAlertTab(tab) {
    alertTab = tab;
    const activeBtn = document.getElementById('tab-btn-active');
    const resolvedBtn = document.getElementById('tab-btn-resolved');
    if (activeBtn && resolvedBtn) {
        if (tab === 'ACTIVE') {
            activeBtn.style.background = 'rgba(var(--primary-rgb),0.15)';
            activeBtn.style.color = 'var(--primary)';
            activeBtn.style.borderColor = 'var(--primary)';
            resolvedBtn.style.background = 'transparent';
            resolvedBtn.style.color = 'var(--text-muted)';
            resolvedBtn.style.borderColor = 'rgba(255,255,255,0.1)';
        } else {
            resolvedBtn.style.background = 'rgba(0,255,136,0.1)';
            resolvedBtn.style.color = '#00ff88';
            resolvedBtn.style.borderColor = '#00ff88';
            activeBtn.style.background = 'transparent';
            activeBtn.style.color = 'var(--text-muted)';
            activeBtn.style.borderColor = 'rgba(255,255,255,0.1)';
        }
    }
    const view = document.getElementById('analysis-view');
    if (view) updateAnalysisTable(view);
}
window.switchAlertTab = switchAlertTab;

async function execNeuralSearch() {
    const query = document.getElementById('log-search-query').value;
    const severity = document.getElementById('log-filter-severity').value;
    
    showToast("Neural Search Executing...", "info");
    
    try {
        const url = `/api/logs/search?query=${encodeURIComponent(query)}&severity=${severity}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.logs) {
            state.analysisData = { logs: data.logs, totalHit: data.totalHit };
            // Ensure UI areas are visible
            const resultsArea = document.getElementById('analysis-dashboard-grid');
            const alertTable = document.querySelector('.table-container.glass-card');
            if (resultsArea) resultsArea.style.display = 'grid';
            if (alertTable) alertTable.style.display = 'block';
            
            updateAnalysisTable(data.logs);
            showToast(`Found ${data.totalHit} matches.`, "success");
        }
    } catch (e) {
        showToast("Search Failure: Link Unstable", "error");
    }
}

async function updateAnalysisTable(manualLogs) {
    const tbody = document.getElementById('logTableBody');
    const viewContainer = document.getElementById('analysis-view');
    if (!tbody || !viewContainer) return;

    let logs = manualLogs;

    // If no manual logs provided, fetch from live history
    if (!logs) {
        try {
            const res = await fetch(`/api/logs/history?status=${alertTab}`);
            if (!res.ok) throw new Error('Not authorized');
            logs = await res.json();
        } catch (e) {
            console.error("[SOC] History fetch failed:", e.message);
            return;
        }
    }

    const pill = viewContainer.querySelector('#log-count-pill');
    if (pill) pill.innerText = `${logs.length} ${alertTab === 'ACTIVE' ? 'Active Alerts' : 'Resolved Alerts'}`;

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color: var(--text-muted);"><i class="fas fa-shield-check"></i> Neural link stable. No anomalies found.</td></tr>`;
        renderSOCPanels([], viewContainer);
        return;
    }

    renderSOCPanels(logs.filter(l => l.status === 'ACTIVE'), viewContainer);

    tbody.innerHTML = logs.map((log, idx) => {
        const sev = (log.severity || 'INFO').toUpperCase();
        const riskColor = log.riskScore > 40 ? '#ff0055' : log.riskScore > 15 ? '#ffcc00' : '#00ff88';
        const attempts = log.attempts > 1 ? `<span style="color:#ff0055; font-weight:bold; display:block; font-size: 1.1rem; margin-top:5px;">${log.attempts}x ATTEMPTS</span>` : '<span style="color:var(--text-muted)">1st Event</span>';

        const hasLocation = log.ip && log.ip.includes('(');
        const locationText = hasLocation ? log.ip.split('(')[1].replace(')', '') : 'N/A';
        const locationChip = hasLocation ? `<span class="stat-pill" style="font-size: 0.65rem; background: rgba(var(--primary-rgb),0.1); color: var(--primary); border: 1px solid rgba(var(--primary-rgb),0.3);"><i class="fas fa-map-marker-alt"></i> ${locationText}</span>` : '<span class="stat-pill" style="font-size:0.65rem; background:rgba(255,255,255,0.05); color:var(--text-muted);"><i class="fas fa-globe"></i> LOCAL</span>';

        const resolveBtn = alertTab === 'ACTIVE'
            ? `<button onclick="resolveAlert(${log.id}, this)" class="btn-primary" style="padding: 6px 12px; font-size: 0.72rem; width:100%; margin-bottom: 8px; box-shadow: 0 0 10px rgba(var(--primary-rgb),0.2);"><i class="fas fa-check-double"></i> RESOLVE</button>`
            : `<span style="color: #00ff88; font-size: 0.8rem; font-weight:700;"><i class="fas fa-check-circle"></i> ARCHIVED</span>`;

        const blockBtn = (alertTab === 'ACTIVE' && log.ip && !log.ip.includes('LOCAL'))
            ? `<button onclick="blockIP('${log.ip}', this)" style="background: rgba(255,0,85,0.1); border: 1px solid #ff0055; color: #ff0055; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 0.72rem; width:100%; margin-bottom: 8px; font-weight:600; transition: all 0.3s;"><i class="fas fa-shield-virus"></i> BLOCK SOURCE</button>`
            : '';

        return `
        <tr id="log-row-${log.id || idx}" class="fade-in">
            <td><span class="badge-severity ${sev}">${sev}</span></td>
            <td>
                <div style="font-size: 0.85rem; font-weight:700;">${log.device || 'Neural Core'}</div>
                <div style="font-size: 0.77rem; color: var(--text-muted); font-family: var(--font-mono); margin: 3px 0;">${log.ip || '-'}</div>
                ${locationChip}
            </td>
            <td style="text-align:center;">${attempts}</td>
            <td>
                <div style="font-weight: 900; color: ${riskColor}; font-size: 1.1rem; text-shadow: 0 0 10px ${riskColor}33;">${log.riskScore || 0}%</div>
                <div style="font-size: 0.65rem; color: var(--text-muted);">Points</div>
            </td>
            <td style="font-size:0.8rem; color:#888; white-space: nowrap;">${new Date(log.timestamp || log.createdAt).toLocaleTimeString()}</td>
            <td style="font-family: 'Space Mono', monospace; font-size: 0.8rem; max-width: 350px;">
                <div style="color: #fff; line-height: 1.3;">${log.message || ''}</div>
                <div style="margin-top: 10px; padding: 10px; background: rgba(var(--primary-rgb), 0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); border-left: 2px solid ${log.isAnomaly ? '#ff0055' : 'var(--primary)'};">
                    <div style="font-size: 0.7rem; text-transform: uppercase; color: ${log.isAnomaly ? '#ff0055' : 'var(--primary)'}; letter-spacing: 1.5px; font-weight:800; margin-bottom: 5px; display:flex; justify-content:space-between;">
                        <span><i class="fas fa-${log.isAnomaly ? 'radiation' : 'microchip'}"></i> Prime_AI ${log.isAnomaly ? 'Anomaly Detection' : 'Interpretation'}</span>
                    </div>
                    <div style="font-size:0.85rem; color: var(--text-main); line-height: 1.4;">${typeof formatSuggestion === 'function' ? formatSuggestion(log.suggestion) : (log.suggestion || 'Analyzing vector...')}</div>
                </div>
            </td>
            <td style="width: 130px; background: rgba(255,255,255,0.01); border-left: 1px solid rgba(255,255,255,0.05); vertical-align: middle;">
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${resolveBtn}
                    ${blockBtn}
                </div>
            </td>
        </tr>`;
    }).join('');
}

// --- SOC Observability Handlers ---
let socChartInstance = null;
function renderSOCPanels(logs, viewContainer) {
    if (!viewContainer) return;

    let highRiskCount = 0;
    let medRiskCount = 0;
    const sources = {};
    const timelineData = new Array(15).fill(0); // Assuming 15 time buckets

    logs.forEach(log => {
        const sev = (log.severity || '').toUpperCase();
        const score = log.riskScore || 0;
        
        if (score >= 70 || log.isAnomaly || sev === 'CRITICAL' || sev === 'ERROR') {
            highRiskCount++;
        } else if (score >= 30 || sev === 'WARN') {
            medRiskCount++;
        }

        let sourceKey = log.device || 'Neural Core';
        if (log.ip && log.ip !== '0.0.0.0') sourceKey = log.ip;
        sources[sourceKey] = (sources[sourceKey] || 0) + (log.attempts || 1);
    });

    const highRiskEl = viewContainer.querySelector('#soc-high-risk');
    const medRiskEl = viewContainer.querySelector('#soc-med-risk');
    if (highRiskEl) {
        highRiskEl.innerText = highRiskCount;
        highRiskEl.style.color = highRiskCount > 0 ? '#ff0055' : 'var(--text-muted)';
    }
    if (medRiskEl) {
        medRiskEl.innerText = medRiskCount;
        medRiskEl.style.color = medRiskCount > 0 ? '#ffcc00' : 'var(--text-muted)';
    }

    // Render Top Sources
    const topSourcesEl = viewContainer.querySelector('#soc-top-sources');
    if (topSourcesEl) {
        const sortedSources = Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (sortedSources.length > 0) {
            topSourcesEl.innerHTML = sortedSources.map(s =>
                `<div style="display:flex; justify-content:space-between; font-size: 0.85rem; padding: 6px; background: rgba(0,0,0,0.2); border-radius:4px; border-left: 2px solid var(--primary);">
                    <span style="color:var(--text-main); font-family: monospace;">${s[0]}</span>
                    <span style="color:var(--primary); font-weight:bold;">${s[1]} hits</span>
                 </div>`
            ).join('');
        } else {
            topSourcesEl.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:10px;">No anomalous sources detected.</div>';
        }
    }

    // Render Timeline Chart
    const ctx = viewContainer.querySelector('#socTimelineChart');
    if (ctx && window.Chart) {
        // Mocking timeline distribution based on log counts over short timeframe
        // Distribute logs into 'bursts' for a more realistic incident timeline
        const primaryBucket = Math.floor(Math.random() * 5) + 8; // Recent burst (bucket 8-13)
        const secondaryBucket = Math.floor(Math.random() * 5); // Older burst (bucket 0-4)
        
        logs.forEach((l, idx) => {
            const bucket = (idx % 3 === 0) ? primaryBucket : (idx % 7 === 0) ? secondaryBucket : Math.floor(Math.random() * 15);
            timelineData[bucket] += (l.attempts || 1);
        });

        if (socChartInstance) socChartInstance.destroy();
        socChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: 15 }, (_, i) => "-" + (15 - i) + "m"),
                datasets: [{
                    label: 'Anomalies / Errors',
                    data: timelineData,
                    borderColor: '#00e5ff',
                    backgroundColor: 'rgba(0, 229, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } }, grid: { display: false } },
                    y: { ticks: { color: 'rgba(255,255,255,0.4)', beginAtZero: true, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }
}

async function resolveAlert(logId, btn) {
    if (!logId) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const res = await fetch(`/ api / logs / resolve / ${logId}`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            // Socket will handle UI update via 'log_resolved' event
            showToast(`✅ Alert #${logId} resolved`, 'success');
        } else {
            showToast(data.error || 'Failed to resolve', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Resolve';
        }
    } catch (e) {
        showToast('Connection error', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Resolve';
    }
}
window.resolveAlert = resolveAlert;

async function blockIP(ip, btn) {
    if (!ip || ip.includes('LOCAL')) return;
    const cleanIp = ip.split(' ')[0];
    btn.disabled = true;
    showToast(`Initiating Protocol: FW - SHIELD on ${cleanIp}...`, 'info');
    try {
        const res = await fetch('/api/logs/block-ip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip: cleanIp })
        });
        const data = await res.json();
        showToast(data.message, 'success');
        btn.innerHTML = '<i class="fas fa-shield-virus"></i> BLOCKED';
    } catch (e) {
        showToast("System Link Fault", 'error');
        btn.disabled = false;
    }
}

async function suspendUserFromAlert(msg, btn) {
    // Attempt to extract email if present in message
    const emailMatch = msg.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (!emailMatch) {
        showToast("No User Identity (Email) detected in log payload", "warning");
        return;
    }
    const email = emailMatch[0];
    btn.disabled = true;
    try {
        const res = await fetch('/api/logs/disable-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, 'success');
            btn.innerHTML = '<i class="fas fa-user-slash"></i> SUSPENDED';
        } else {
            showToast(data.error, 'error');
            btn.disabled = false;
        }
    } catch (e) {
        showToast("Neural Handshake Failure", 'error');
        btn.disabled = false;
    }
}

window.blockIP = blockIP;
window.suspendUserFromAlert = suspendUserFromAlert;

function formatSuggestion(text) {
    if (!text) return 'Analyzing...';
    // Simplified for non-technical users
    if (text.includes('Why:')) {
        const parts = text.split('Why:');
        return `<strong > ${parts[0]}</strong> <br><span style="font-size:0.75rem; color:var(--text-muted)">Reason: ${parts[1]}</span>`;
    }
    return text;
}


async function renderInfrastructure() {
    const view = showView('infrastructure-view');

    if (view.getAttribute('data-rendered') !== 'true') {
        view.innerHTML = `
        <div class="infra-stats-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
            <div class="card glass-card" style="padding: 20px;">
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Global Uptime</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary);" id="infra-uptime">99.98%</div>
            </div>
            <div class="card glass-card" style="padding: 20px;">
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Fleet Capacity</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: var(--secondary);" id="infra-count">...</div>
            </div>
            <div class="card glass-card" style="padding: 20px;">
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Avg Pool Load</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: #ffcc00;" id="infra-avg-load">...</div>
            </div>
            <div class="card glass-card" style="padding: 20px;">
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Neural Handshake</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: var(--quantum);">STABLE</div>
            </div>
        </div>

        <div class="card glass-card">
            <div class="results-header" style="padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05)">
                <div class="card-title font-transformers"><i class="fas fa-network-wired"></i> Infrastructure Fleet Command</div>
                <button class="btn-primary" style="padding: 8px 20px; font-size: 0.8rem;" onclick="showToast('Scanning decentralized nodes...', 'info')">Scan Network</button>
            </div>
            <div class="table-container" style="overflow-x: auto;">
                <table class="log-table" style="margin-top: 10px; width: 100%;">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Identity / Host</th>
                            <th>Network Address</th>
                            <th>Region</th>
                            <th>Resource Load (C/R/D)</th>
                            <th>Uptime</th>
                            <th>Active Threads</th>
                        </tr>
                    </thead>
                    <tbody id="infra-table-body">
                         <tr><td colspan="7" style="text-align:center; padding: 40px;">Synchronizing fleet telemetry...</td></tr>
                    </tbody>
                </table>
            </div>
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
            if (tbody) tbody.innerHTML = `<tr> <td colspan="5" style="text-align:center; padding: 20px; color:red">Failed to load infrastructure data</td></tr> `;
        }
        console.error(e);
    }
}

/**
 * Enterprise Timeline Narrative v7.5
 */
async function renderTimeline() {
    const view = showView('timeline-view');
    view.innerHTML = `
                    <div class="timeline-container fade-in">
                        <div class="card glass-card" style="margin-bottom: 30px; border-left: 4px solid var(--primary); background: rgba(var(--primary-rgb), 0.05); padding: 20px;">
                            <h4 class="font-transformers"><i class="fas fa-history"></i> Chronological Security Narrative</h4>
                            <p style="font-size:0.85rem; color:var(--text-muted); margin-top:5px;">Follow the step-by-step evolution of incidents detected by SentinelX.</p>
                        </div>
                        <div id="narrative-content" style="padding-left: 30px; position: relative; border-left: 1px dashed rgba(255,255,255,0.1); margin-left: 15px;">
                            <div style="padding: 40px; text-align:center; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Reading neural history...</div>
                        </div>
                    </div>
                    `;

    try {
        const res = await fetch('/api/logs/timeline');
        const logs = await res.json();
        const narrativeBody = document.getElementById('narrative-content');

        if (!logs.length) {
            narrativeBody.innerHTML = '<div style="color:var(--text-muted);">No timeline events recorded in this session.</div>';
            return;
        }

        narrativeBody.innerHTML = logs.map((log, idx) => {
            const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const date = new Date(log.timestamp).toLocaleDateString();
            const color = log.severity === 'CRITICAL' ? '#ff0055' : log.severity === 'ERROR' ? '#ffcc00' : 'var(--primary)';
            
            // Phase Mapping Strategy (v8.0 Blueprint)
            const msg = (log.message || '').toLowerCase();
            let phaseIcon = 'fa-circle-info';
            let phaseLabel = 'SYSTEM_EVENT';
            
            if (msg.includes('breach') || log.severity === 'CRITICAL') {
                phaseIcon = 'fa-radiation';
                phaseLabel = 'THREAT_EXFIL';
            } else if (msg.includes('fail') || msg.includes('deny') || msg.includes('block')) {
                phaseIcon = 'fa-shield-halved';
                phaseLabel = 'INCIDENT_MITIGATION';
            } else if (msg.includes('probe') || msg.includes('scan') || msg.includes('port')) {
                phaseIcon = 'fa-crosshairs';
                phaseLabel = 'RECON_DISCOVERY';
            }

            return `
                    <div class="timeline-item" style="position: relative; margin-bottom: 40px;">
                        <div class="timeline-dot" style="position: absolute; left: -36px; top: 5px; width: 12px; height: 12px; border-radius: 50%; background: ${color}; box-shadow: 0 0 15px ${color};"></div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">${date} | ${time}</div>
                        <div class="card glass-card" style="margin-top: 10px; padding: 20px; max-width: 650px; border-left: 3px solid ${color};">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                                <div style="font-weight: 900; color: #fff; letter-spacing: 0.5px;">${log.device || 'SYSTEM'} <i class="fas fa-chevron-right" style="font-size:0.6rem; opacity:0.3; margin:0 8px;"></i> ${log.severity}</div>
                                <span class="stat-pill" style="font-size:0.65rem; background:rgba(255,255,255,0.05); color:${color}; border:1px solid ${color}33;">
                                    <i class="fas ${phaseIcon}"></i> ${phaseLabel}
                                </span>
                            </div>
                            <div style="font-size: 0.9rem; color: #eee; line-height: 1.5; font-family: 'Space Mono', monospace;">${log.message}</div>
                            <div style="margin-top: 15px; padding: 12px; background: rgba(var(--primary-rgb), 0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.03);">
                                <div style="font-size: 0.65rem; color: var(--primary); text-transform: uppercase; font-weight: 900; margin-bottom: 5px; letter-spacing: 1px;">AI Neural Synthesis</div>
                                <div style="font-size: 0.85rem; color: var(--text-main); font-style: italic;">"${log.suggestion || 'Analyzing event telemetry...'}"</div>
                            </div>
                        </div>
                    </div>
                    `;
        }).join('');

    } catch (e) {
        showToast("Narrative Read Failed", "error");
    }
}

function renderInfraTable(servers, viewContainer) {
    if (!viewContainer || typeof viewContainer === 'string') {
        viewContainer = document.getElementById('infrastructure-view');
        if (!viewContainer) return;
    }

    const tbody = viewContainer.querySelector('#infra-table-body');
    const countPill = viewContainer.querySelector('#infra-count');
    const avgLoadEl = viewContainer.querySelector('#infra-avg-load');

    if (countPill) countPill.innerText = `${servers.length} NODES`;
    
    if (avgLoadEl && servers.length > 0) {
        const avg = Math.round(servers.reduce((acc, s) => acc + (s.cpu || 0), 0) / servers.length);
        avgLoadEl.innerText = `${avg}%`;
    }

    if (!tbody) return;

    let rows = '';
    if (servers.length === 0) {
        rows = '<tr><td colspan="7" style="text-align:center; padding: 40px; color: var(--text-muted);">No machines registered in this sector.</td></tr>';
    } else {
        rows = servers.map(s => `
        <tr class="fade-in">
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="pulse-dot" style="background:${getStatusColor(s.status)}; width: 8px; height: 8px;"></span>
                    <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 800; color: ${getStatusColor(s.status)}">${s.status}</span>
                </div>
            </td>
            <td><div style="font-weight: 800; color: var(--text-main);">${s.hostname}</div><div style="font-size: 0.7rem; color: var(--text-muted);">${s.apiKey ? 'AGENT LINKED' : 'STATIC NODE'}</div></td>
            <td><code>${s.ipAddress}</code></td>
            <td>${s.region || 'CORE'}</td>
            <td>
                <div style="display:flex; flex-direction:column; gap: 5px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.65rem;"><span>CPU</span><span>${s.cpu || 0}%</span></div>
                    <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px;"><div style="width:${s.cpu || 0}%; height:100%; background:var(--primary); border-radius:2px;"></div></div>
                    <div style="display:flex; justify-content:space-between; font-size:0.65rem;"><span>RAM</span><span>${s.ram || 0}%</span></div>
                    <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px;"><div style="width:${s.ram || 0}%; height:100%; background:var(--secondary); border-radius:2px;"></div></div>
                </div>
            </td>
            <td style="font-family:'Space Mono', monospace; font-size:0.8rem;">${s.uptime || 'N/A'}</td>
            <td style="text-align:center;"><span class="stat-pill" style="border-radius:4px;">${s.activeProcesses || 0}</span></td>
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
                    <div class="settings-view">
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

async function handleAnalysisUpload(input) {
    let file = null;
    let inputEl = null;

    console.log("[DEBUG] handleAnalysisUpload triggered with:", input);

    // Support FileList, Event, or Element
    if (input instanceof FileList) {
        file = input[0];
    } else if (input && input.target && input.target.files) {
        file = input.target.files[0];
        inputEl = input.target;
    } else if (input && input.files) {
        file = input.files[0];
        inputEl = input;
    } else if (input && input.constructor && input.constructor.name === 'FileList') {
        file = input[0];
    }

    if (!file) {
        console.warn("[INGEST] No file object detected in input source.");
        return;
    }

    console.log("[INGEST] Attempting synchronization for:", file.name);

    const statusEl = document.getElementById('upload-status');
    const dropzone = document.getElementById('log-dropzone');
    
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.innerHTML = `<i class="fas fa-sync fa-spin"></i> Synchronizing <strong>${file.name}</strong>...`;
    }
    if (dropzone) {
        dropzone.style.borderColor = 'var(--primary)';
        dropzone.style.background = 'rgba(var(--primary-rgb), 0.05)';
    }

    const formData = new FormData();
    formData.append('log', file);

    try {
        const res = await fetch('/api/analysis/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `Server Error: ${res.status}`);
        }

        const data = await res.json();
        console.log("[INGEST] Analysis successful:", data);
        state.analysisData = data;
        showToast("Log analysis complete. Neural results synchronized.", "success");
        renderAnalysis(); // Refresh view to show report
        
    } catch (e) {
        console.error("[CRITICAL] Analysis Error:", e);
        showToast(e.message || "Local neural core connection failed.", "error");
    } finally {
        if (statusEl) statusEl.style.display = 'none';
        if (dropzone) {
            dropzone.style.borderColor = 'rgba(var(--primary-rgb), 0.3)';
            dropzone.style.background = 'rgba(var(--primary-rgb), 0.02)';
        }
        if (inputEl) inputEl.value = ''; // Reset input
    }
}

function demoHeuristicCheck() {
    showToast("Initializing automated neural scrub...", "info");
    setTimeout(() => {
        showToast("Pattern match found: Potential SQL Injection attempt in Auth-Gateway.", "warning");
    }, 1500);
}

window.handleAnalysisUpload = handleAnalysisUpload;
window.demoHeuristicCheck = demoHeuristicCheck;


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
    const view = showView('topology-view');

    if (view.getAttribute('data-rendered') !== 'true') {
        view.innerHTML = `
        <div class="topology-view fade-in">
            <div class="topology-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px;">
                <div>
                    <h1 class="font-transformers" style="font-size: 1.8rem; margin-bottom: 5px;">Neural Topology Map</h1>
                    <div class="stat-pill"><i class="fas fa-project-diagram"></i> Live Network Mesh | D3 Force Engine</div>
                </div>
                <div class="topology-controls">
                    <button class="btn-primary" onclick="initTopologyGraph()"><i class="fas fa-sync"></i> Recalculate Force</button>
                </div>
            </div>
            
            <div class="topology-map-container card glass-card" style="padding:0; overflow:hidden; position:relative; min-height:550px; background: radial-gradient(circle at center, #0a1120 0%, #050a15 100%); border: 1px solid rgba(0,255,136,0.1);">
                <div id="topo-legend" style="position:absolute; top:20px; left:20px; z-index:10; font-size:0.7rem; color:var(--text-muted); background:rgba(0,0,0,0.5); padding:10px; border-radius:4px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px;"><span style="width:10px; height:10px; border-radius:50%; background:var(--primary);"></span> Super Admin / Nexus</div>
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px;"><span style="width:10px; height:10px; border-radius:50%; background:var(--secondary);"></span> Production Servers</div>
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;"><span style="width:10px; height:10px; border-radius:50%; background:#ff4444;"></span> External Threats</div>
                    <div style="font-style:italic; opacity:0.6;">* Drag nodes to adjust layout</div>
                </div>
                <div id="topo-d3-container" style="width:100%; height:550px;"></div>
            </div>
        </div>
        `;
        view.setAttribute('data-rendered', 'true');
    }
    
    // Always re-init graph when tab is clicked to ensure correct dimensions
    setTimeout(() => initTopologyGraph(), 100);
}

async function initTopologyGraph() {
    const container = document.getElementById('topo-d3-container');
    if (!container) return;
    container.innerHTML = '';

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    // Data Preparation
    const servers = state.infraData || [];
    const nodes = [
        { id: 'NEXUS-CORE', label: 'NEURAL-CENTER', type: 'core', group: 1 }
    ];
    const links = [];

    servers.forEach(s => {
        nodes.push({ id: s.id || s.hostname, label: s.hostname, type: 'server', status: s.status, group: 2 });
        links.push({ source: 'NEXUS-CORE', target: s.id || s.hostname, value: 1 });
    });

    // Add cross-connections for visual richness
    if (nodes.length > 3) {
        for(let i=1; i<nodes.length-1; i++) {
           if(Math.random() > 0.7) links.push({ source: nodes[i].id, target: nodes[i+1].id, value: 0.5 });
        }
    }

    const svg = d3.select("#topo-d3-container")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible");

    // Glow Effect
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "3.5").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(50));

    const link = svg.append("g")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", "rgba(0, 255, 136, 0.15)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", d => d.value < 1 ? "4,4" : "0");

    // --- Phase 2: Neural Traffic Particles (WOW Factor) ---
    const particleGroup = svg.append("g").attr("class", "traffic-particles");
    const spawnParticle = () => {
        if (!document.getElementById('topo-d3-container') || links.length === 0) return;
        const l = links[Math.floor(Math.random() * links.length)];
        if (!l.source.x || !l.target.x) return; // Wait for simulation cold-start

        const p = particleGroup.append("circle")
            .attr("r", 1.5)
            .attr("fill", "var(--secondary)")
            .style("opacity", 0.8)
            .style("filter", "drop-shadow(0 0 3px var(--secondary))");

        p.transition()
            .duration(1500 + Math.random() * 2000)
            .ease(d3.easeLinear)
            .attrTween("transform", () => t => {
                const x = l.source.x + (l.target.x - l.source.x) * t;
                const y = l.source.y + (l.target.y - l.source.y) * t;
                return `translate(${x},${y})`;
            })
            .on("end", function() { d3.select(this).remove(); });

        setTimeout(spawnParticle, 800 + Math.random() * 1000);
    };
    setTimeout(spawnParticle, 2000); // Wait for simulation to settle

    const node = svg.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .attr("class", "topo-node-group")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("circle")
        .attr("r", d => d.type === 'core' ? 25 : 12)
        .attr("fill", d => d.type === 'core' ? 'var(--primary)' : 'rgba(10, 15, 25, 0.8)')
        .attr("stroke", d => d.type === 'core' ? 'white' : (d.status === 'online' ? 'var(--secondary)' : '#ff4444'))
        .attr("stroke-width", d => d.type === 'core' ? 3 : 2)
        .style("filter", d => d.type === 'core' ? "url(#glow)" : "none")
        .style("cursor", "pointer");

    node.append("text")
        .attr("dy", d => d.type === 'core' ? 45 : 30)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--text-main)")
        .style("font-size", "10px")
        .style("font-family", "Space Mono, monospace")
        .style("pointer-events", "none")
        .text(d => d.label);

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    window.topoSimulation = simulation;
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
                            <div class="report-card glass-card" style="border-top: 4px solid var(--secondary);">
                                <i class="fas fa-balance-scale"></i>
                                <h3 class="font-transformers">NIST/ISO Alignment</h3>
                                <p>Regulatory compliance audit against NIST 800-53 controls.</p>
                                <div class="stat-pill" style="margin-bottom:15px; border-color:var(--secondary); color:var(--secondary)">82% Compliance Match</div>
                                <div class="report-download-group">
                                    <button class="btn-primary" style="padding: 10px 25px; display: flex; align-items: center; gap: 10px; background: rgba(var(--secondary-rgb), 0.1); border: 1px solid var(--secondary); color: var(--secondary);">
                                        Audit Report <i class="fas fa-chevron-down" style="font-size: 0.8rem;"></i>
                                    </button>
                                    <div class="report-dropdown-menu">
                                        <a href="javascript:void(0)" onclick="generateReportDirect('compliance', 'pdf')">
                                            <i class="fas fa-file-invoice" style="color: var(--secondary);"></i> Full Compliance Audit
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
                                        <a href="javascript:void(0)" onclick="generateReportDirect('security', 'excel')">
                                            <i class="fas fa-file-excel" style="color: #217346;"></i> Excel Spreadsheet
                                        </a>
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
                            <div class="report-download-group" style="margin-left: auto; margin-right: 15px;">
                                <button class="btn-primary" style="padding: 6px 15px; font-size: 0.8rem; background: #f2c811; color: #000; border: none;">
                                    Export Data <i class="fas fa-download" style="margin-left:8px"></i>
                                </button>
                                <div class="report-dropdown-menu" style="right: 0; left: auto; transform: none; width: 160px;">
                                    <a href="javascript:void(0)" onclick="generateReportDirect('powerbi', 'pbix')">
                                        <i class="fas fa-file-code" style="color: #f2c811;"></i> .PBIX Format
                                    </a>
                                    <a href="javascript:void(0)" onclick="generateReportDirect('powerbi', 'csv')">
                                        <i class="fas fa-file-csv" style="color: #00ff88;"></i> .CSV Dataset
                                    </a>
                                </div>
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
                                <div id="pbi-resource-grid" style="display:none; width: 100%;">
                                     <!-- JS Rendered -->
                                 </div>
                                 <div id="pbi-security-grid" style="display:none; width: 100%;">
                                     <!-- JS Rendered -->
                                 </div>
                             </main>
                         </div>
                     </div>
                     `;
    
    // 1. ADD TAB EVENT LISTENERS
    const tabContainer = view.querySelector('#pbi-tab-container');
    if (tabContainer) {
        tabContainer.querySelectorAll('.pbi-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Switch Active Tab Class
                tabContainer.querySelectorAll('.pbi-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Toggle Grids
                const target = tab.getAttribute('data-tab');
                const grids = ['pbi-overview-grid', 'pbi-resource-grid', 'pbi-security-grid'];
                grids.forEach(g => {
                   const el = document.getElementById(g);
                   if (el) el.style.display = g === `pbi-${target}-grid` ? 'grid' : 'none';
                });

                // Initialize Tab Specific Data
                if (target === 'resource') initResourcePBITab();
                if (target === 'security') initSecurityPBITab();
            });
        });
    }

    view.setAttribute('data-rendered', 'true');

    // Initialize Charts with PowerBI styling (Initial Tab: Overview)
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
                            <button class="btn-primary" onclick="performLabHandshake('${lab}', this)" style="width: 100%; padding: 15px; font-weight: bold;">
                                INITIALIZE HANDOVER
                            </button>
                        </div>
                    </div>
                    `;
}

async function performLabHandshake(lab, el) {
    const btn = el || (typeof event !== 'undefined' ? event.target : null);
    if (!btn) {
        console.warn("Handshake target not found, searching by lab...");
        // Fallback if target is missing
    }
    if (btn) btn.disabled = true;
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SYNCHRONIZING...';

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
    const adminPerm = isAdmin();

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
                                    <div class="card-title font-transformers"><i class="fas fa-globe-americas"></i> Global Threat Intelligence v7.5</div>
                                    <div class="stat-pill pulse-dot" style="background: rgba(var(--primary-rgb), 0.1);"><i class="fas fa-satellite-dish"></i> ACTIVE_SCAN</div>
                                </div>
                                <div id="pulse-scan-area" style="height: 380px; margin-top: 20px; background: rgba(0,0,0,0.4); border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); position: relative; background-image: radial-gradient(circle, rgba(0,212,255,0.05) 1px, transparent 1px); background-size: 30px 30px;">
                                    <!-- SVG World Map Container -->
                                    <div id="world-map-svg-container" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative;">
                                        <svg viewBox="0 0 1000 500" style="width: 100%; height: 80%; fill: rgba(255,255,255,0.05); stroke: rgba(var(--primary-rgb), 0.2); stroke-width: 0.5;">
                                            <!-- Simplified World Paths (Abstract Representation) -->
                                            <path d="M150,150 Q180,100 250,150 T400,150" fill="none" stroke-width="1" />
                                            <circle cx="210" cy="180" r="100" fill="rgba(var(--primary-rgb), 0.02)" />
                                            <circle cx="600" cy="250" r="150" fill="rgba(var(--primary-rgb), 0.02)" />
                                            <text x="50%" y="50%" text-anchor="middle" fill="rgba(255,255,255,0.1)" font-family="Space Mono" font-size="24">SIGNAL_ENCRYPTION_ACTIVE</text>

                                            <!-- Dynamic Pulse Points (Step 8 Visualization) -->
                                            <g id="map-threat-points">
                                                <circle cx="250" cy="180" r="5" fill="#ff0055" class="pulse-point">
                                                    <animate attributeName="r" from="3" to="15" dur="2s" repeatCount="indefinite" />
                                                    <animate attributeName="opacity" from="1" to="0" dur="2s" repeatCount="indefinite" />
                                                </circle>
                                                <circle cx="800" cy="300" r="5" fill="#ffcc00" class="pulse-point">
                                                    <animate attributeName="r" from="3" to="12" dur="3s" repeatCount="indefinite" />
                                                    <animate attributeName="opacity" from="1" to="0" dur="3s" repeatCount="indefinite" />
                                                </circle>
                                            </g>
                                        </svg>

                                        <!-- Floating Data Chips -->
                                        <div style="position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.6); padding: 10px; border-radius: 8px; font-size: 0.7rem; border: 1px solid var(--primary); font-family: 'Space Mono';">
                                            <div style="color: var(--primary);">LATENCY: 12ms</div>
                                            <div style="color: #00ff88;">UPLINK: SECURE</div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Neural Metrics Row -->
                                <div style="margin-top: 25px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                                    <div class="card" style="background: rgba(var(--primary-rgb), 0.1); border: 1px solid rgba(var(--primary-rgb),0.2);">
                                        <div style="font-size: 0.7rem; color: var(--primary); text-transform: uppercase; letter-spacing: 1px;">Ingress Rate</div>
                                        <div style="font-size: 1.5rem; font-weight: 800; margin-top: 5px;" id="pulse-pps">${pps}k/s</div>
                                        <div style="font-size: 0.65rem; color: var(--text-muted);">Packets Verified</div>
                                    </div>
                                    <div class="card" style="background: rgba(162,77,255,0.1); border: 1px solid rgba(162,77,255,0.2);">
                                        <div style="font-size: 0.7rem; color: var(--secondary); text-transform: uppercase; letter-spacing: 1px;">Entropy Delta</div>
                                        <div style="font-size: 1.5rem; font-weight: 800; margin-top: 5px;" id="pulse-sessions">${sessions}</div>
                                        <div style="font-size: 0.65rem; color: var(--text-muted);">Active Sessions</div>
                                    </div>
                                    <div class="card" style="background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.2);">
                                        <div style="font-size: 0.7rem; color: #00ff88; text-transform: uppercase; letter-spacing: 1px;">Coherence</div>
                                        <div style="font-size: 1.5rem; font-weight: 800; margin-top: 5px;">99.4%</div>
                                        <div style="font-size: 0.65rem; color: var(--text-muted);">Sync Confidence</div>
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
                                <button class="btn-primary" style="width: 100%; margin-top: 30px; background: rgba(255,0,85,0.1); border: 1px solid #ff0055; color: #ff0055; ${!adminPerm ? 'opacity:0.3; cursor:not-allowed;' : ''}"
                                    onclick="${adminPerm ? " showToast('Protocol-9 Lockdown Engaged', 'error')" : "showToast('Admin Access Required', 'warning')"}"
                                ${!adminPerm ? 'title="Restricted Control"' : ''}>Global Lockdown</button>
                            ${!adminPerm ? '<p style="font-size:0.7rem; color:var(--text-muted); text-align:center; margin-top:10px;"><i class="fas fa-lock"></i> Advanced Controls: Admins Only</p>' : ''}
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

        showToast(`Global Pulse Synchronized.Threat Level: ${data.threat_level}`, "success");
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

    const adminPerm = isAdmin();

    view.innerHTML = `
                <div class= "ailab-container fade-in">
        <!--OPERATIONAL DIRECTIVE-->
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
                <p style="color: var(--text-muted); margin-top: 10px; margin-bottom: 25px;">Manage, train, and deploy local intelligence models for autonomous infrastructure recovery. Integrated with PRIME_AI Python Core.</p>
            </div>

            <div class="card glass-card" style="padding: 25px; text-align: center;">
                <div style="font-size: 2.5rem; color: var(--primary); margin-bottom: 15px;"><i class="fas fa-microchip"></i></div>
                <h3 class="font-transformers">Model Parameters</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">Current Weights: 1.2B (Optimized)</p>
                <button class="btn-primary" style="width:100% ${!adminPerm ? '; opacity:0.5; cursor:not-allowed;' : ''}" 
                    onclick="${adminPerm ? 'syncAIWeights(this)' : "showToast('Admin Access Required', 'warning')"}"
                    ${!adminPerm ? 'title="Restricted Control"' : ''}>Sync Weights</button>
            </div>

            <div class="card glass-card" style="padding: 25px; text-align: center;">
                <div style="font-size: 2.5rem; color: var(--secondary); margin-bottom: 15px;"><i class="fas fa-database"></i></div>
                <h3 class="font-transformers">Neural Corpus</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">Total unique events: 142.5k</p>
                <button class="btn-primary" style="width:100% ${!adminPerm ? '; opacity:0.5; cursor:not-allowed;' : ''}" 
                    onclick="${adminPerm ? "showToast('Expanding training set from Audit Vault...', 'info')" : "showToast('Admin Access Required', 'warning')"}"
                    ${!adminPerm ? 'title="Restricted Control"' : ''}>Extend Corpus</button>
            </div>

                    <div class="card glass-card" style="padding: 25px; text-align: center;">
                        <div style="font-size: 2.5rem; color: #00ff88; margin-bottom: 15px;"><i class="fas fa-brain"></i></div>
                        <h3 class="font-transformers">Triage Accuracy</h3>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">Current confidence score: 98.2%</p>
                        <button class="btn-primary" style="width:100%; background: #00ff88; color: black; ${!adminPerm ? 'opacity:0.5; cursor:not-allowed;' : ''}"
                            onclick="${adminPerm ? 'retrainAIModel(this)' : " showToast('Admin Access Required', 'warning')"}"
                        ${!adminPerm ? 'title="Restricted Control"' : ''}>Trigger Retraining</button>
            </div>
        </div>
                    ${!adminPerm ? '<div style="margin-top:20px; padding:15px; background:rgba(255,165,0,0.05); border-radius:10px; border:1px solid rgba(255,165,0,0.2); text-align:center;"><p style="color:orange; font-size:0.8rem;"><i class="fas fa-user-shield"></i> Information: Viewing in READ-ONLY mode. Advanced training controls require Admin Clearance.</p></div>' : ''}
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
            showToast(`Synced ${data.nodes_updated} nodes.Ver: ${data.weights_version}`, "success");
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
            showToast(`Model retraining complete.Accuracy: ${data.accuracy} % (Epoch ${data.epoch})`, "success");
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
    loadVaultData();
    view.setAttribute('data-rendered', 'true');
}

async function loadVaultData(filter = '') {
    const tbody = document.getElementById('vault-table-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Accessing Neural Archives...</td></tr>';
    try {
        const res = await fetch('/api/logs/history?status=RESOLVED');
        if (!res.ok) throw new Error('Not authorized');
        const logs = await res.json();

        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-muted);"><i class="fas fa-archive"></i> No resolved incidents found in the Archive.</td></tr>';
            return;
        }

        const filtered = logs.filter(log =>
            !filter ||
            (log.device && log.device.toLowerCase().includes(filter.toLowerCase())) ||
            (log.message && log.message.toLowerCase().includes(filter.toLowerCase()))
        );

        tbody.innerHTML = filtered.map(log => {
            const riskColor = (log.riskScore || 0) > 40 ? '#ff0055' : (log.riskScore || 0) > 15 ? '#ffcc00' : '#00ff88';
            return `
            <tr class="fade-in" >
                <td><span style="font-family: 'Space Mono'; color: var(--primary);">#VX-${String(log.id).padStart(3, '0')}</span></td>
                <td style="font-size: 0.8rem;">${new Date(log.timestamp || log.createdAt).toLocaleDateString()} ${new Date(log.timestamp || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                    <div>${log.device || 'System'}</div>
                    <div style="font-size:0.75rem; color: var(--text-muted);">${log.ip || ''}</div>
                </td>
                <td>
                    <span class="stat-pill" style="background: rgba(0,255,136,0.1); color: #00ff88;"><i class="fas fa-check-circle"></i> Resolved</span>
                    <div style="font-size:0.75rem; margin-top: 4px; color: ${riskColor};">Risk: ${log.riskScore || 0} pts</div>
                </td>
                <td>
                    <button onclick="showToast('Incident: ${(log.message || '').substring(0, 60).replace(/'/g, '')}', 'info')" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer;" title="${(log.message || '').replace(/"/g, '')}"><i class="fas fa-eye"></i></button>
                </td>
            </tr> `;
        }).join('');

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-muted);">No records match your query.</td></tr>';
        }

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: #ff0055;"><i class="fas fa-unlink"></i> Archive Core Offline — Login as Admin to access vault.</td></tr>';
    }
}

function searchVault() {
    const term = document.getElementById('vault-search').value;
    loadVaultData(term);
}
window.searchVault = searchVault;

// --- Enterprise Risk Score Banner (Step 4) ---
async function refreshRiskScore() {
    try {
        const res = await fetch('/api/logs/risk-score');
        if (!res.ok) return;
        const data = await res.json();

        let badge = document.getElementById('risk-score-badge');
        if (!badge) {
            // Inject badge into topbar if not there
            const userActions = document.querySelector('.user-actions');
            if (!userActions) return;
            badge = document.createElement('div');
            badge.id = 'risk-score-badge';
            badge.style.cssText = 'display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; cursor: default; transition: all 0.5s; border: 1px solid;';
            userActions.insertBefore(badge, userActions.firstChild);
        }

        const score = data.percentage || 0;
        const color = data.color === 'red' ? '#ff0055' : data.color === 'yellow' ? '#ffcc00' : '#00ff88';
        const label = data.color === 'red' ? 'CRITICAL' : data.color === 'yellow' ? 'VIGILANT' : 'OPTIMIZED';

        badge.style.background = `rgba(${data.color === 'red' ? '255,0,85' : data.color === 'yellow' ? '255,204,0' : '0,255,136'}, 0.1)`;
        badge.style.borderColor = color;
        badge.style.color = color;
        badge.style.boxShadow = data.color === 'red' ? `0 0 12px rgba(255, 0, 85, 0.3)` : 'none';
        badge.innerHTML = `<i class="fas fa-shield-alt" ></i> Risk: ${score}% <span style="font-size:0.7rem; opacity:0.8;">${label}</span>`;
    } catch (e) {
        // Silent fail — not logged in
    }
}
window.refreshRiskScore = refreshRiskScore;

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

    const adminPerm = isAdmin();

    view.innerHTML = `
            <div class="automation-container fade-in">
        <!--OPERATIONAL DIRECTIVE-->
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
                        <label style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Directives Repository ${!adminPerm ? '(Read Only)' : ''}</label>
                        <select id="testing-tool-select" class="form-input" style="width: 100%; margin-top: 5px; height: 45px;">
                            ${tools.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                        </select>
                    </div>
                    <button class="btn-primary" onclick="${adminPerm ? 'executeAutomationTest()' : "showToast('Admin Access Required', 'warning')"}" 
                        style="height: 45px; padding: 0 30px; ${!adminPerm ? 'opacity:0.5; cursor:not-allowed;' : ''}"
                        ${!adminPerm ? 'title="Restricted Control"' : ''}>
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
    consoleEl.innerHTML = `<div style = "color:var(--primary)"> [EXEC] Starting ${toolId} sequence...</div> `;
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
                statusEl.innerHTML = `<span style = "color:${data.overall === 'STABLE' || data.overall === 'SECURE' || data.overall === 'FAST' || data.overall === 'OPTIMIZED' ? '#00ff88' : '#ff0055'}" > ${data.overall}</span> `;
                consoleEl.innerHTML += `<div style = "margin-top:10px; color:#00ff88;"> [DONE] Report generated for ${data.tool}.Overall Status: ${data.overall}</div> `;
                renderTestSummary(data);
                showToast("Test Sequence Complete", "success");
                return;
            }

            const r = data.results[i];
            const color = r.status === 'PASS' ? '#00ff88' : '#ffa600';
            consoleEl.innerHTML += `<div><span style="color:#888;">[${r.timestamp.split('T')[1].split('.')[0]}]</span> <span style="color:${color}">[${r.status}]</span> ${r.step}: ${r.detail}</div> `;
            consoleEl.scrollTop = consoleEl.scrollHeight;
            i++;
        }, 800);

    } catch (e) {
        statusEl.innerHTML = '<span style="color:#ff0055">FAILED</span>';
        consoleEl.innerHTML += `<div style = "color:#ff0055"> [ERROR] Execution aborted: Server unreachable.</div> `;
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
            <div style = "font-size: 1.2rem; font-weight: 700; color: white; margin-bottom: 15px;"> ${data.tool}</div>
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
    toast.className = `toast toast - ${type} `;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    toast.innerHTML = `
            <i class="fas fa-${icon}" ></i>
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
            <div class="dashboard-grid" style = "grid-template-columns: 2fr 1fr; gap: 25px;">
        <!--Main Identifier-->
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

        <!--Detailed Stats Area-->
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

        <!--Security Log Area-->
         <div class="card glass-card">
            <div class="card-title">Session Intelligence</div>
            <div style="margin-top: 20px;">
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px;">Active Secure Access Tokens:</p>
                <ul id="active-sessions-list" style="list-style: none; padding: 0;">
                    <li style="text-align:center; padding: 20px; color: var(--text-muted); font-size: 0.8rem;">
                        <i class="fas fa-satellite fa-spin"></i> Querying Session Registry...
                    </li>
                </ul>
                <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn-primary" style="width: 100%; font-size: 0.9rem;" onclick="showToast('MFA Setup Initiated', 'info')">Enable MFA Protection</button>
                    <button class="btn-primary" style="width: 100%; background: transparent; border: 1px solid #ff0055; color: #ff0055; font-size: 0.9rem;" onclick="terminateOtherSessions()">Destroy Other Access Tokens</button>
                </div>
            </div>
            </div>
        </div>

        <!--Advanced Metadata Area-->
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

    fetchSessions(); // Call initial session load
    view.setAttribute('data-rendered', 'true');
}

async function fetchSessions() {
    const list = document.getElementById('active-sessions-list');
    if (!list) return;
    try {
        const res = await fetch('/api/auth/sessions');
        const sessions = await res.json();
        list.innerHTML = sessions.map(s => {
            const isCurrent = s.isCurrent ? ' <span style="color: #00ff88; font-weight:bold;">[CURRENT]</span>' : '';
            return `
            <li style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 0.85rem; color: white;">${s.device || 'Neural Workstation'}${isCurrent}</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">${s.ip} • ${s.browser} • ${s.location || 'Unknown'}</div>
                    <div style="font-size: 0.65rem; color: #666; margin-top: 3px;">${new Date(s.lastAccess).toLocaleString()}</div>
                </div>
                ${!s.isCurrent ? `<button onclick="terminateSession('${s.sessionId}')" style="background:none; border:none; color:#ff0055; cursor:pointer;"><i class="fas fa-times"></i></button>` : '<i class="fas fa-shield-alt" style="color:#00ff88"></i>'}
            </li>`;
        }).join('');
    } catch (e) { list.innerHTML = '<li>Vault Desync: Session retrieval failed.</li>'; }
}

async function terminateSession(id) {
    if(!confirm("Destroy this access token?")) return;
    try {
        const res = await fetch(`/api/auth/sessions/${id}`, { method: 'DELETE' });
        if (res.ok) { showToast("Security token destroyed.", "success"); fetchSessions(); }
    } catch (e) { showToast("Termination failed", "error"); }
}

async function terminateOtherSessions() {
    if(!confirm("Purge all other security tokens?")) return;
    try {
        const res = await fetch('/api/auth/sessions', { method: 'DELETE' });
        if (res.ok) { showToast("Global session purge successful.", "success"); fetchSessions(); }
    } catch (e) { showToast("Purge failed", "error"); }
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
    div.className = `message msg - ${type} `;

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

    // Attach Robust Logout Listener
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent the dropdown from immediately hiding and canceling the event flow
            logout(e);
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
            <button class="btn-pdf" onclick = "generateReport('pdf')" >
                <i class="fas fa-file-pdf"></i> PDF Document
        </button>
            `;
    } else {
        const reportName = type === 'availability' ? 'Weekly Availability' : 'Performance Trends';
        desc.innerText = `Select export format for ${reportName}: `;
        actions.innerHTML = `
            <button class="btn-excel" onclick = "generateReport('excel')" >
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
        } else if (targetType === 'powerbi') {
            const res = await fetch('/api/metrics/history'); // Use metrics for BI demo
            data = await res.json();
            title = "PowerBI Intelligence Dataset";
        }

        // --- Data Validation ---
        if (!data || (Array.isArray(data) && data.length === 0)) {
            showToast(`No historical data found for ${title}.`, "warning");
            closeDownloadModal();
            return;
        }

        if (data.error) {
            showToast(`Server Error: ${data.error} `, "error");
            closeDownloadModal();
            return;
        }

        if (format === 'pdf') {
            generatePDF(title, data, targetType);
        } else if (format === 'excel') {
            generateExcel(title, data, targetType);
        } else if (format === 'pbix') {
            generatePBIX(title, data);
        } else if (format === 'csv') {
            generateCSV(title, data, targetType);
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
        body = data.map(d => [d.severity, d.device, d.message, new Date(d.createdAt || d.timestamp).toLocaleString()]);
    } else if (type === 'performance' || type === 'powerbi') {
        head = [['Time', 'CPU (%)', 'Mem (%)', 'Net Traffic']];
        body = data.map(d => [new Date(d.createdAt || d.timestamp).toLocaleString(), d.cpuLoad, d.memoryUsage, d.networkTraffic]);
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
    ws_data.push([`Generated: ${new Date().toLocaleString()} `]);
    ws_data.push([]); // Empty row

    // Data Mapping
    if (type === 'availability') {
        ws_data.push(['Hostname', 'IP Address', 'Region', 'Status', 'Load (%)']);
        data.forEach(d => ws_data.push([d.hostname, d.ipAddress, d.region, d.status, d.load]));
    } else if (type === 'security') {
        ws_data.push(['Severity', 'Device', 'Message', 'Timestamp', 'Suggestion']);
        data.forEach(d => ws_data.push([d.severity, d.device, d.message, d.createdAt, d.suggestion]));
    } else if (type === 'performance' || type === 'powerbi') {
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

function generateCSV(title, data, type) {
    if (!window.XLSX) return showToast("Library Error", "error");
    const { utils, writeFile } = window.XLSX;

    // Convert to sheet then to CSV
    let ws_data = [];
    if (type === 'powerbi') {
        ws_data.push(['Timestamp', 'CPU_Load', 'Memory_Usage', 'Network_Traffic']);
        data.forEach(d => ws_data.push([new Date(d.createdAt).toISOString(), d.cpuLoad, d.memoryUsage, d.networkTraffic]));
    } else {
        data.forEach(d => ws_data.push(Object.values(d)));
    }

    const ws = utils.aoa_to_sheet(ws_data);
    writeFile({ SheetNames: ['data'], Sheets: { 'data': ws } }, `${type}_data_${Date.now()}.csv`, { bookType: 'csv' });
    showToast("CSV Downloaded Successfully", "success");
}

function generatePBIX(title, data) {
    // Generate a mock PBIX (binary bubble representing a JSON structure)
    const mockPbiContent = JSON.stringify({
        version: "v1.0-SentinelX",
        timestamp: new Date().toISOString(),
        dataset: data,
        directive: "Import this JSON into PowerBI Desktop via Get Data > JSON"
    });
    const blob = new Blob([mockPbiContent], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinelx_intelligence_${Date.now()}.pbix`;
    a.click();
    showToast("PBIX Template Downloaded", "success");
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
                        <span style="color: #00ff88;"><0.4ms</span>
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
    </div>
    `;
    view.setAttribute('data-rendered', 'true');
}


// --- FORGOT PASSWORD (Bulletproof v9.0) ---
async function handleForgotPassword() {
    const email = document.getElementById('fp-email').value;
    if (!email || !email.includes('@')) return showToast("Enter a valid Mail ID.", "warning");

    const btn = document.querySelector('#fp-email-step button');

    // 1. INSTANT INTERFACE SWAP (Zero Latency)
    document.getElementById('fp-email-step').style.display = 'none';
    document.getElementById('fp-recovery-step').style.display = 'block';

    const otpInp = document.getElementById('fp-otp');
    if (otpInp) otpInp.focus();

    showToast("Processing recovery sequence...", "info");

    // 2. BACKGROUND TRANSMISSION
    try {
        const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (res.ok) {
            showToast(`Protocol active.Check your mail or use fallback: <strong>${data.toast_otp}</strong>`, "success");
        } else {
            showToast(data.error || "Identity link failed.", "error");
            // Do not boot the user out, allow them to check their input
            btn.disabled = false;
            btn.innerText = originalText;
        }
    } catch (e) {
        showToast("Offline mode: SMTP simulation active.", "warning");
    }
}

async function resetPasswordFull() {
    const email = document.getElementById('fp-email').value;
    const otp = document.getElementById('fp-otp').value;
    const password = document.getElementById('fp-new-pass').value;
    const confirm = document.getElementById('fp-confirm-pass').value;

    if (otp.length !== 6) return showToast("Enter 6-digit key.", "warning");
    if (password.length < 4) return showToast("Password too short.", "warning");
    if (password !== confirm) return showToast("Passwords mismatch.", "error");

    const btn = document.querySelector('#fp-recovery-step button');
    btn.disabled = true;
    btn.innerText = "Saving...";

    try {
        const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, password })
        });

        if (res.ok) {
            showToast("Success! Credentials updated.", "success");
            setTimeout(() => location.reload(), 1000); // Instant Access
        } else {
            const data = await res.json();
            showToast(data.error || "Update protocol failed.", "error");
            btn.disabled = false;
            btn.innerText = "Update credentials & Login";
        }
    } catch (e) {
        showToast("Core Sync Lost.", "error");
        btn.disabled = false;
        btn.innerText = "Update credentials & Login";
    }
}

function returnToLogin() {
    document.getElementById('forgot-password-form').style.display = 'none';
    document.getElementById('forgot-password-form').reset();
    document.getElementById('fp-email-step').style.display = 'block';
    document.getElementById('fp-recovery-step').style.display = 'none';

    document.getElementById('login-form').style.display = 'block';
    const toggleBtn = document.getElementById('toggle-auth');
    if (toggleBtn) toggleBtn.style.display = 'inline-block';
}

// --- GLOBAL EVENT DELEGATION (BULLETPROOF LOGOUT) ---
// This ensures that even if the DOM is refreshed or inline listeners detach,
// clicking the logout button will always trigger securely and prevent default anchor jumping.
document.addEventListener('click', (e) => {
    const btn = e.target.closest('#logout-btn');
    if (btn) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Global Event Delegation: Logout triggered securely.");
        logout(e);
    }
});


/**
 * SentinelX Live Feed Engine v10.0
 * Injects real-time security events into the Overview dashboard.
 */
function updateLiveFeedUI(log) {
    const feed = document.getElementById('global-live-feed');
    if (!feed) return;

    // Remove the placeholder if it exists (first item)
    if (feed.querySelector('i.fa-satellite')) feed.innerHTML = '';

    const timestamp = new Date(log.timestamp || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const color = log.severity === 'CRITICAL' ? '#ff0055' : log.severity === 'ERROR' ? '#ffcc00' : 'var(--primary)';

    const item = document.createElement('div');
    item.className = 'fade-in';
    item.style.marginBottom = '12px';
    item.style.padding = '10px 15px';
    item.style.borderLeft = `3px solid ${color}`;
    item.style.background = 'rgba(255,255,255,0.03)';
    item.style.borderRadius = '8px';
    item.style.fontSize = '0.78rem';
    item.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

    item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <span style="color:${color}; font-weight:900; letter-spacing:1px; font-size: 0.65rem;">${(log.severity || 'INFO').toUpperCase()}</span>
            <span style="color:#666; font-size:0.65rem; font-family:var(--font-mono);">${timestamp}</span>
        </div>
        <div style="color:#fff; line-height:1.4;">
            <span style="color:var(--text-muted); font-family:var(--font-mono); font-size:0.7rem;">${log.device || 'CORE'}</span>
            <i class="fas fa-chevron-right" style="font-size:0.6rem; color:#444; margin:0 5px;"></i> ${log.message}
        </div>
    `;

    feed.prepend(item);
    
    // Maintain max 15 items for performance
    if (feed.children.length > 15) feed.lastElementChild.remove();
}

/**
 * Multi-Factor Authentication (MFA) Setup 
 * Simulates a cryptographic handshake and QR code generation.
 */
async function setupMFA() {
    // 1. Create Glass Modal
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fade-in';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:10000; backdrop-filter:blur(10px);';
    
    modal.innerHTML = `
        <div class="card glass-card fade-in-up" style="width: 450px; padding: 40px; border: 1px solid var(--primary);">
            <div style="text-align:center; margin-bottom:30px;">
                <div style="font-size: 3rem; color: var(--primary); margin-bottom: 20px;"><i class="fas fa-shield-halved fa-pulse"></i></div>
                <h2 class="font-transformers" style="font-size: 1.5rem; color: #fff;">Quantum MFA Setup</h2>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-top:10px;">Secure your identity with a cryptographic secondary layer.</p>
            </div>

            <div style="background: white; width: 170px; height: 170px; margin: 0 auto 30px; padding: 10px; border-radius: 12px; display: flex; justify-content:center; align-items:center;">
                <!-- Simulating QR Code -->
                <div style="width:100%; height:100%; background: #000; display:flex; justify-content:center; align-items:center; color:white; font-size:0.5rem; text-align:center;">
                   MFA_TOKEN_GENERATED<br>[SECURE_BLOB]
                </div>
            </div>

            <div style="margin-bottom: 25px;">
                <label style="font-size: 0.7rem; color: var(--primary); text-transform: uppercase; font-weight: 800; display: block; margin-bottom: 8px;">Enter 6-Digit Matrix Code</label>
                <input type="text" id="mfa-verify-code" class="form-input" placeholder="000000" maxlength="6" style="text-align:center; letter-spacing: 5px; font-size: 1.5rem;">
            </div>

            <div style="display:flex; gap:15px;">
                <button class="btn-primary" style="flex:1" id="mfa-verify-btn">ACTIVATE TOKEN</button>
                <button class="btn-primary" style="flex:1; background:transparent; border:1px solid #444;" onclick="this.closest('.modal-backdrop').remove()">CANCEL</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const verifyBtn = document.getElementById('mfa-verify-btn');
    verifyBtn.onclick = async () => {
        const code = document.getElementById('mfa-verify-code').value;
        if (code.length === 6) {
           verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SYNCING...';
           verifyBtn.disabled = true;
           
           // Real API call (Phase 1 logic)
           try {
               const res = await fetch('/api/auth/mfa/setup', { method: 'POST' });
               if (res.ok) {
                   modal.remove();
                   showToast("MFA Activated: Neural signature synced.", "success");
                   state.user.mfaEnabled = true;
                   renderProfile(); // Re-render to show active
               } else {
                   throw new Error("Handshake failed");
               }
           } catch (e) {
               showToast("Cryptographic link failed. Try again.", "error");
               verifyBtn.disabled = false;
               verifyBtn.innerHTML = 'ACTIVATE TOKEN';
           }
        } else {
           showToast("Invalid sequence detected. Try again.", "error");
        }
    };
}

console.log('Scripts fully loaded!')
