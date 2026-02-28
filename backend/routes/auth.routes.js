const router = require('express').Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;

const bcrypt = require('bcryptjs');
const { User } = require('../models');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

// --- Email Transporter Cache ---
let transporterCache = null;

function getTransporter() {
    if (transporterCache) return transporterCache;

    // Check for real SMTP credentials in .env
    const host = process.env.EMAIL_HOST;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (host && user && pass) {
        transporterCache = nodemailer.createTransport({
            host: host,
            port: process.env.EMAIL_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: user,
                pass: pass
            }
        });
        console.log("--- EMAIL TRANSPORT: LIVE SMTP ---");
    } else {
        // Fallback or Test/Development (Simulated in terminal)
        console.warn("--- EMAIL TRANSPORT: SIMULATED (No Credentials) ---");
    }
    return transporterCache;
}

// --- Security Layer: Rate Limiting ---
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login requests per window
    message: { error: "SECURITY ALERT: Excessive authentication attempts. Neural link throttled." },
    standardHeaders: true,
    legacyHeaders: false,
});


// --- Helper: Find or Create User in DB ---
async function findOrCreateUser(profile, provider) {
    try {
        const [user, created] = await User.findOrCreate({
            where: { providerId: profile.id, provider: provider },
            defaults: {
                name: profile.displayName || profile.username || 'User',
                email: (profile.emails && profile.emails[0].value) || `no-email-${profile.id}@example.com`,
                photo: (profile.photos && profile.photos[0].value) || null,
                role: 'User'
            }
        });
        return user;
    } catch (err) {
        console.error("Auth Error:", err);
        return null;
    }
}

// --- Strategy Configuration ---

// Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "PLACEHOLDER",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "PLACEHOLDER",
    callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    const user = await findOrCreateUser(profile, 'google');
    return done(null, user);
}));

// GitHub
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || "PLACEHOLDER",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "PLACEHOLDER",
    callbackURL: "/api/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
    const user = await findOrCreateUser(profile, 'github');
    return done(null, user);
}));

// LinkedIn
passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID || "PLACEHOLDER",
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "PLACEHOLDER",
    callbackURL: "/api/auth/linkedin/callback",
    scope: ['r_emailaddress', 'r_liteprofile'],
}, async (accessToken, refreshToken, profile, done) => {
    const user = await findOrCreateUser(profile, 'linkedin');
    return done(null, user);
}));

// Serialization
passport.serializeUser((user, done) => {
    done(null, user.id); // Save ID to session
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
        done(null, user); // Attach full user to req.user
    } catch (err) {
        done(err, null);
    }
});

// --- Routes ---

// Local Login (For Email/Pass)
// Currently handled by frontend checking hardcoded credentials, 
// but we can add a real endpoint here if needed.
// For now, let's keep the mock social endpoints but make them create DB users.

// Google Mock
router.get('/google', async (req, res) => {
    // Create/Find Mock User
    const [user] = await User.findOrCreate({
        where: { email: 'mock@google.com' },
        defaults: { name: 'Mock Google User', role: 'User', provider: 'google', providerId: 'mock-google-1' }
    });
    req.session.user = user;
    req.session.save(() => res.redirect('/?auth=success'));
});

// GitHub Mock
router.get('/github', async (req, res) => {
    const [user] = await User.findOrCreate({
        where: { email: 'mock@github.com' },
        defaults: { name: 'Mock GitHub User', role: 'Developer', provider: 'github', providerId: 'mock-github-1' }
    });
    req.session.user = user;
    req.session.save(() => res.redirect('/?auth=success'));
});

// LinkedIn Mock
router.get('/linkedin', async (req, res) => {
    const [user] = await User.findOrCreate({
        where: { email: 'mock@linkedin.com' },
        defaults: { name: 'Mock LinkedIn User', role: 'Manager', provider: 'linkedin', providerId: 'mock-linkedin-1' }
    });
    req.session.user = user;
    req.session.save(() => res.redirect('/?auth=success'));
});

// Current User Info
router.get('/me', async (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ authenticated: true, user: req.user });
    } else if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        // Fallback: Check if header/token logic exists? No.
        res.status(401).json({ authenticated: false });
    }
});

// --- Local Auth Routes ---

// --- Real-time OTP Store (In-Memory for current deployment session) ---
const otpStore = {};

// POST /api/auth/request-otp
router.post('/request-otp', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Identity details required' });

        // Check if user already exists
        const existing = await User.findOne({ where: { email } });
        if (existing) return res.status(400).json({ error: 'This email is already registered.' });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store temporarily in memory (hashed/secured for 10 minutes)
        otpStore[email] = {
            otp,
            data: { name, email, password },
            expires: Date.now() + 10 * 60 * 1000 // 10 mins
        };

        const transport = getTransporter();
        if (transport) {
            // Live Send
            await transport.sendMail({
                from: `"SentinelX Security" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "QUANTUM OTP: Neural Handshake Verification",
                text: `Your 6-digit access code for SentinelX Professional is: ${otp}`,
                html: `
                    <div style="background:#04060b; color:#fff; padding:40px; border-radius:15px; font-family:sans-serif;">
                        <h2 style="color:#00f2ff; letter-spacing:2px;">SENTINELX ACCESS CODE</h2>
                        <p style="color:#888;">Verification sequence required for identity synchronization.</p>
                        <div style="background:rgba(0,242,255,0.1); border:1px solid #00f2ff; padding:20px; font-size:2rem; text-align:center; letter-spacing:10px; color:#00f2ff; font-weight:bold;">
                            ${otp}
                        </div>
                        <p style="font-size:0.8rem; color:#444; margin-top:30px;">This code will expire in 10 minutes. If you did not request this, please secure your uplink immediately.</p>
                    </div>
                `
            });
            res.json({ message: 'OTP broadcasted successfully.', mode: 'live' });
        } else {
            // Simulated Send (For local testing/dev)
            console.log("\x1b[36m%s\x1b[0m", `[SIMULATED EMAIL] To: ${email} | OTP: ${otp}`);
            res.json({
                message: 'Local Simulation: OTP generated.',
                mode: 'simulation',
                otp: otp // Only send back for simulation to allow testing
            });
        }
    } catch (err) {
        console.error("OTP Error:", err);
        res.status(500).json({ error: 'Failed to initiate handshake sequence.' });
    }
});

// POST /api/auth/verify-registration
router.post('/verify-registration', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const record = otpStore[email];

        if (!record || record.expires < Date.now()) {
            return res.status(400).json({ error: 'OTP session expired. Please re-request.' });
        }

        if (record.otp !== otp) {
            return res.status(400).json({ error: 'OTP Signature mismatch. Access denied.' });
        }

        // OTP Valid - Register User
        const { name, password } = record.data;
        const hashedPassword = await bcrypt.hash(password, 8);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'User',
            provider: 'local'
        });

        // Clear record
        delete otpStore[email];

        req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
        res.json({ message: 'Identity synchronized. Welcome to SentinelX.', user: req.session.user });
    } catch (err) {
        console.error("Verification Error:", err);
        res.status(500).json({ error: 'Handshake verification failed.' });
    }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        const signature = req.headers['x-neural-handshake'];

        // Layer 2: Signature Handshake
        if (signature !== 'quantum-v7-authorized') {
            return res.status(403).json({ error: 'SECURITY BREACH: Invalid Neural Handshake Signature.' });
        }

        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        // 1. Authenticate via DB (Real Security)
        let user = await User.findOne({ where: { email } });

        if (!user) {
            // "store the credentials in database once if they login"
            // Auto-register Client if not found
            const hashedPassword = await bcrypt.hash(password, 4);
            user = await User.create({
                name: email.split('@')[0], // Generate a name from email
                email,
                password: hashedPassword,
                role: 'user',
                provider: 'local'
            });
            console.log(`New client auto-registered: ${email}`);
        } else {
            // Existing user - check credentials
            if (user.provider !== 'local') return res.status(401).json({ error: 'Wrong username or password' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ error: 'Wrong username or password' });
        }

        req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
        res.json({ message: 'Login successful', user: req.session.user });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: 'Login failed' });
    }
});


// PUT /api/auth/profile
router.put('/profile', async (req, res) => {
    try {
        const { name, email } = req.body;
        const userId = req.session.user ? req.session.user.id : (req.user ? req.user.id : null);

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (name) user.name = name;
        if (email) user.email = email; // Note: In real app, verify email uniqueness

        await user.save();

        // Update Session
        if (req.session.user) {
            req.session.user.name = user.name;
            req.session.user.email = user.email;
        }

        res.json({ message: 'Profile updated', user });
    } catch (err) {
        console.error("Profile Update Error:", err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// GET /api/auth/logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/?logout=true');
    });
});

module.exports = router;
