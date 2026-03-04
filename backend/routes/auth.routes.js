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

async function getTransporter() {
    if (transporterCache) return transporterCache;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : null;

    if (user && pass && user.includes('@')) {
        try {
            console.log(`[SMTP] Initializing Global Postal Empire via service: 'gmail'`);
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user, pass }
            });

            await transporter.verify();
            transporterCache = transporter;
            console.log("\x1b[32m%s\x1b[0m", `[SERVER] GLOBAL POSTAL EMPIRE: [CONNECTED]`);
            console.log(`[HANDSHAKE] Handshake Successful. Broadcast Protocol Active.`);
            return transporterCache;
        } catch (e) {
            console.error("\x1b[31m%s\x1b[0m", `[SERVER] HANDSHAKE FAILED: ${e.message}`);
            if (e.code === 'EAUTH') {
                console.error("[TIP] 1. Verify 2-Step Verification is ENABLED on your Google Account.");
                console.error("[TIP] 2. Ensure 'lrre akkl fjor ilsh' is exactly entered (with/without spaces).");
            }
            transporterCache = null;
        }
    } else {
        console.warn("\x1b[33m%s\x1b[0m", "[SERVER] BROADCASTER OFFLINE: Simulation Mode Enabled");
    }
    return transporterCache;
}

// Immediate Boot Health-Check
(async () => {
    setTimeout(async () => {
        console.log("[HEALTH] Initializing SMTP Broadcaster check...");
        await getTransporter();
    }, 2000);
})();

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
    if (req.session.user) return res.json({ authenticated: true, user: { ...req.session.user, theme: 'dark' } });
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
    console.log(`[AUTH] Handshake started for ${req.body.email}`);
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            console.error("[AUTH] Missing credentials block");
            return res.status(400).json({ error: 'All fields required' });
        }

        console.log(`[AUTH] Checking database for existing identity: ${email}`);
        const exists = await User.findOne({ where: { email } });
        if (exists) {
            console.warn(`[AUTH] Identity already established for ${email}`);
            return res.status(400).json({ error: 'ALREADY_REGISTERED', message: 'Email already registered. Redirecting to login.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // --- DYNAMIC IDENTITY HANDSHAKE ---
        console.log(`[AUTH] Initializing Dynamic Identity Handshake for ${email}...`);

        let mailer = null;
        let authMode = 'MASTER';

        try {
            // Attempt to verify the user as their own Broadcaster
            const dynamicTransporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: email, pass: password }
            });

            // Strict 6s timeout race for the dynamic verify
            const verifyPromise = dynamicTransporter.verify();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('HANDSHAKE_TIMEOUT')), 6000));

            await Promise.race([verifyPromise, timeoutPromise]);

            mailer = dynamicTransporter;
            authMode = 'DYNAMIC';
            console.log(`[AUTH] Dynamic Authority established for ${email}`);
        } catch (e) {
            console.warn(`[AUTH] Dynamic Handshake Bypassed: ${e.message}`);
            console.log(`[AUTH] Routing broadcast through SentinelX Master Core...`);
            mailer = await getTransporter();
        }

        otpStore[`reg_${email}`] = {
            otp,
            userData: { name, email, password },
            expires: Date.now() + 300000 // Exact 5-minute security window requested
        };
        console.log(`[AUTH] Sequence Refreshed: New Registration OTP broadcast sequence active for ${email}`);

        if (mailer) {
            console.log(`[AUTH] Dispatching OTP via ${authMode} protocol...`);
            try {
                const mailPromise = mailer.sendMail({
                    from: `"SentinelX" <no-reply@SentinelX.com>`, // As per user diagram
                    to: email,
                    subject: `Log-in to your SentinelX Account: ${otp}`,
                    html: `
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; padding: 40px; border-radius: 12px; color: #333; max-width: 500px; margin: auto; border: 1px solid #e0e0e0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                            <!-- Brand Header -->
                            <div style="text-align: left; margin-bottom: 25px;">
                                <h1 style="color: #008080; margin: 0; font-size: 28px; letter-spacing: -0.5px; font-weight: 700;">SentinelX</h1>
                                <div style="height: 3px; width: 40px; background-color: #00ffcc; margin-top: 5px;"></div>
                            </div>
                            
                            <p style="font-size: 16px; margin-bottom: 20px;">Hello User,</p>
                            
                            <p style="font-size: 15px; line-height: 1.6; color: #555;">
                                Ready to Log-in? Use below OTP to log in to your SentinelX account.
                            </p>
                            
                            <!-- OTP Box -->
                            <div style="background-color: #fff; border: 2px solid #008080; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
                                <span style="font-size: 36px; font-weight: 700; color: #008080; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace;">${otp}</span>
                            </div>
                            
                            <p style="font-size: 14px; color: #cc0000; font-weight: 600; margin-bottom: 30px;">
                                Do not Share Your OTP with anyone to keep your account safe.
                            </p>
                            
                            <div style="border-top: 1px solid #eee; padding-top: 20px;">
                                <p style="font-size: 14px; margin: 0; font-weight: 600;">Regards,</p>
                                <p style="font-size: 14px; margin: 0; color: #008080;">SentinelX</p>
                                <p style="font-size: 11px; color: #999; margin-top: 15px; text-transform: uppercase; letter-spacing: 1px;">
                                    SentinelX all rights Reserved.
                                </p>
                            </div>
                        </div>
                    `
                });

                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 12000));
                await Promise.race([mailPromise, timeoutPromise]);

                console.log(`[AUTH] OTP successfully broadcasted via ${authMode}`);
                return res.json({ mode: 'live', auth: authMode });
            } catch (err) {
                console.error("[AUTH] Broadcast failure:", err.message);
            }
        }

        console.log(`[AUTH] Entering simulation mode for ${email}`);
        res.json({ mode: 'simulation', otp });
    } catch (err) {
        console.error("[AUTH] Handshake FATAL:", err);
        res.status(500).json({ error: 'Sync initialization failed' });
    }
});

router.post('/verify-registration', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const entry = otpStore[`reg_${email}`];
        if (!entry || entry.expires < Date.now()) return res.status(400).json({ error: 'Expired' });
        if (entry.otp !== otp) return res.status(400).json({ error: 'Invalid' });

        const { name, password } = entry.userData;
        // Case 1: Saving registered user with hashed password
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword, // Verified: hashed before storage
            role: 'super_admin',
            provider: 'local'
        });

        console.log(`[AUTH] Identity PERSISTED: ${email} registered successfully.`);
        delete otpStore[`reg_${email}`];
        req.session.user = user;
        req.session.save(() => res.json({ success: true, user }));
    } catch (err) {
        console.error("[AUTH] Registration Commit Failed:", err);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Forgot Password Protocol
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Identity not found.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[`reset_${email}`] = { otp, expires: Date.now() + 300000 };

    const mailer = await getTransporter();
    if (mailer) {
        try {
            await mailer.sendMail({
                from: `"SentinelX" <no-reply@SentinelX.com>`,
                to: email,
                subject: `SentinelX Reset Code: ${otp}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 30px; border: 1px solid #eee; max-width: 500px; margin: auto;">
                        <h2 style="color: #008080;">PASSWORD RESET PROTOCOL</h2>
                        <p>Hello User,</p>
                        <p>We received a request to refresh your access credentials. Use the sequence below:</p>
                        <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 10px; font-weight: bold; color: #008080; border: 2px dashed #008080;">
                            ${otp}
                        </div>
                        <p style="color: red; font-size: 12px; margin-top: 20px;">If you did not request this, please secure your account immediately.</p>
                        <p>Regards,<br>SentinelX Security</p>
                    </div>
                `
            });
            return res.json({ success: true, message: 'Reset OTP broadcasted.' });
        } catch (e) { console.error(e); }
    }
    res.json({ success: false, mode: 'simulation', otp, message: 'Broadcaster simulation: Use OTP' });
});

router.post('/verify-reset-otp', (req, res) => {
    const { email, otp } = req.body;
    const entry = otpStore[`reset_${email}`];
    if (!entry || entry.expires < Date.now()) return res.status(400).json({ error: 'Expired' });
    if (entry.otp !== otp) return res.status(400).json({ error: 'Invalid' });
    res.json({ success: true });
});

router.post('/reset-password', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ error: 'Identity not found.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();

        console.log(`[AUTH] Credentials REFRESHED for ${email}. Redirecting to Login Handshake.`);
        delete otpStore[`reset_${email}`];
        res.json({ success: true, message: 'Password updated. Please log in.' });
    } catch (err) {
        console.error("[AUTH] Reset commit failed:", err);
        res.status(500).json({ error: 'Update failed' });
    }
});

// Login Handshake (Enforcing Case 1)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(401).json({ error: 'NOT_FOUND', message: 'Identity not found. Please register first.' });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ error: 'PASSWORD_INCORRECT', message: 'Password not correct. Please try again.' });

        console.log(`[AUTH] Access GRANTED for ${email}`);
        req.session.user = user;
        req.session.save(() => res.json({ success: true, user }));
    } catch (err) {
        console.error("[AUTH] Login Handshake FATAL:", err);
        res.status(500).json({ error: 'Acess handshake failed' });
    }
});

module.exports = router;
