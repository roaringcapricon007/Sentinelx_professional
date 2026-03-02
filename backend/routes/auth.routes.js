const router = require('express').Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

// --- REBUILT AUTH ENGINE ---
let transporterCache = null;

function getTransporter() {
    if (transporterCache) return transporterCache;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    // Check placeholders properly
    const isLive = user && pass &&
        !user.includes('your-actual-') &&
        !user.includes('your-gmail') &&
        !pass.includes('your-16-');

    if (isLive) {
        transporterCache = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass }
        });
        console.log("\x1b[32m%s\x1b[0m", `[SERVER] Gmail Broadcast Active: ${user}`);
    } else {
        console.warn("\x1b[33m%s\x1b[0m", "[SERVER] SIMULATION MODE (Email not configured)");
    }
    return transporterCache;
}

const otpStore = {};

// Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "PLACEHOLDER",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "PLACEHOLDER",
    callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    const [user] = await User.findOrCreate({
        where: { providerId: profile.id, provider: 'google' },
        defaults: { name: profile.displayName, email: profile.emails[0].value, role: 'User' }
    });
    return done(null, user);
}));

// GitHub
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || "PLACEHOLDER",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "PLACEHOLDER",
    callbackURL: "/api/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
    const [user] = await User.findOrCreate({
        where: { providerId: profile.id, provider: 'github' },
        defaults: { name: profile.username, email: profile.emails[0].value, role: 'User' }
    });
    return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await User.findByPk(id);
    done(null, user);
});

// Current User Info
router.get('/me', (req, res) => {
    if (req.isAuthenticated()) return res.json({ authenticated: true, user: req.user });
    if (req.session.user) return res.json({ authenticated: true, user: req.session.user });
    res.status(401).json({ authenticated: false });
});

router.get('/logout', (req, res) => {
    req.logout(() => {
        req.session.destroy();
        res.redirect('/?logout=true');
    });
});

// --- OTP Handshake ---
router.post('/request-otp', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

        const exists = await User.findOne({ where: { email } });
        if (exists) return res.status(400).json({ error: 'Email already registered.' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = {
            otp,
            userData: { name, email, password },
            expires: Date.now() + 600000
        };

        const mailer = getTransporter();
        if (mailer) {
            try {
                await mailer.sendMail({
                    from: `"SentinelX Security" <${process.env.EMAIL_USER}>`,
                    to: email,
                    subject: "SentinelX Access Code",
                    html: `<h2>Code: ${otp}</h2>`
                });
                return res.json({ mode: 'live' });
            } catch (err) {
                console.error("Mail Fail:", err.message);
            }
        }
        console.warn(`[SIM] OTP for ${email}: ${otp}`);
        res.json({ mode: 'simulation', otp });
    } catch (err) {
        res.status(500).json({ error: 'Sync initialization failed' });
    }
});

router.post('/verify-registration', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const entry = otpStore[email];
        if (!entry || entry.expires < Date.now()) return res.status(400).json({ error: 'Expired' });
        if (entry.otp !== otp) return res.status(400).json({ error: 'Invalid' });

        const { name, password } = entry.userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword, role: 'User', provider: 'local' });

        delete otpStore[email];
        req.session.user = user;
        req.session.save(() => res.json({ success: true, user }));
    } catch (err) {
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Login Handshake
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Identity not found.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Credentials invalid.' });

    req.session.user = user;
    req.session.save(() => res.json({ success: true, user }));
});

module.exports = router;
