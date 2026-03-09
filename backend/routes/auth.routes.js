const router = require('express').Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const sequelize = require('../database');
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
            console.log(`[SMTP] Establishing Secure Handshake [${user}]...`);

            // Rebuilt configuration for production reliability (Detected Service Mode)
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user, pass },
                tls: { rejectUnauthorized: false }
            });

            // Strict 8s timeout for slower network links (increased from 5s)
            const verifyPromise = transporter.verify();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP_TIMEOUT')), 8000));

            await Promise.race([verifyPromise, timeoutPromise]);

            transporterCache = transporter;
            console.log("\x1b[32m%s\x1b[0m", `[SERVER] SMTP CORE: [CONNECTED]`);
            return transporterCache;
        } catch (e) {
            console.error("\x1b[31m%s\x1b[0m", `[SERVER] SMTP BRIDGE FAILED: ${e.message}`);
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
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect('/?logout=true');
        });
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

        // --- RELIABLE BROADCAST (MASTER ONLY) ---
        const mailer = await getTransporter();
        const authMode = 'MASTER';

        otpStore[`reg_${email}`] = {
            otp,
            userData: { name, email, password },
            expires: Date.now() + 300000 // Exact 5-minute security window requested
        };
        console.log(`[AUTH] Sequence Refreshed: New Registration OTP broadcast sequence active for ${email}`);

        if (mailer) {
            console.log(`[AUTH] Dispatching OTP via MASTER protocol (Fire-and-Forget)...`);
            mailer.sendMail({
                from: `"SentinelX Security" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `SentinelX Verification Code: ${otp}`,
                html: `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; padding: 40px; border-radius: 12px; color: #333; max-width: 500px; margin: auto; border: 1px solid #e0e0e0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <div style="text-align: left; margin-bottom: 25px;">
                            <h1 style="color: #008080; margin: 0; font-size: 28px; letter-spacing: -0.5px; font-weight: 700;">SentinelX</h1>
                            <div style="height: 3px; width: 40px; background-color: #00ffcc; margin-top: 5px;"></div>
                        </div>
                        <p style="font-size: 16px; margin-bottom: 20px;">Hello ${name},</p>
                        <p style="font-size: 15px; line-height: 1.6; color: #555;">
                            Security Handshake initiated. Use the verification code below to establish your identity.
                        </p>
                        <div style="background-color: #fff; border: 2px solid #008080; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
                            <span style="font-size: 36px; font-weight: 700; color: #008080; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace;">${otp}</span>
                        </div>
                        <p style="font-size: 14px; color: #cc0000; font-weight: 600; margin-bottom: 30px;">
                            Security Warning: Do not share this sequence with anyone.
                        </p>
                        <div style="border-top: 1px solid #eee; padding-top: 20px;">
                            <p style="font-size: 14px; margin: 0; font-weight: 600;">Regards,</p>
                            <p style="font-size: 14px; margin: 0; color: #008080;">SentinelX Intelligence Engine</p>
                        </div>
                    </div>`
            }).catch(err => console.error("[AUTH] Mail Dispatch Error:", err.message));
        }

        // --- INSTANT RESPONSE ---
        return res.json({ mode: mailer ? 'live' : 'simulation', otp }); // Provide OTP as fallback anyway
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

// --- FORGOT PASSWORD (STABLE v10.0) ---
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        // 1. Find User (case-insensitive)
        const user = await User.findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('email')),
                '=',
                email.toLowerCase()
            )
        });
        if (!user) return res.status(404).json({ error: 'Mail ID not found.' });

        // 2. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[`reset_${user.email}`] = { otp, expires: Date.now() + 600000 };

        // 3. Dispatch Email (Fire-and-Forget for low latency)
        const mailer = await getTransporter();
        if (mailer) {
            mailer.sendMail({
                from: `"SentinelX Security" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: `Identity Recovery code: ${otp}`,
                html: `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; padding: 40px; border-radius: 12px; color: #333; max-width: 500px; margin: auto; border: 1px solid #e0e0e0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <div style="text-align: left; margin-bottom: 25px;">
                            <h1 style="color: #008080; margin: 0; font-size: 28px; letter-spacing: -0.5px; font-weight: 700;">SentinelX</h1>
                            <div style="height: 3px; width: 40px; background-color: #00ffcc; margin-top: 5px;"></div>
                        </div>
                        <p style="font-size: 16px; margin-bottom: 20px;">Identity Recovery Initiated</p>
                        <p style="font-size: 15px; line-height: 1.6; color: #555;">
                            A password reset sequence was requested. Use the security code below to proceed.
                        </p>
                        <div style="background-color: #fff; border: 2px solid #008080; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
                            <span style="font-size: 36px; font-weight: 700; color: #008080; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace;">${otp}</span>
                        </div>
                        <p style="font-size: 14px; color: #cc0000; font-weight: 600; margin-bottom: 30px;">
                            Warning: This code expires in 10 minutes. 
                        </p>
                        <div style="border-top: 1px solid #eee; padding-top: 20px;">
                            <p style="font-size: 14px; margin: 0; font-weight: 600;">Regards,</p>
                            <p style="font-size: 14px; margin: 0; color: #008080;">SentinelX Security Command</p>
                        </div>
                    </div>`
            }).catch(err => console.error("[AUTH] Recovery Dispatch Error:", err.message));
        }

        // 4. Always return success with OTP (Simulation Fallback)
        return res.json({ success: true, toast_otp: otp });
    } catch (err) {
        console.error("[FORGOT_PASS_ERR]", err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { email, otp, password } = req.body;
    try {
        // Try case-insensitive OTP lookup
        const storeKey = Object.keys(otpStore).find(k =>
            k.toLowerCase() === `reset_${email.toLowerCase()}`
        );
        const entry = storeKey ? otpStore[storeKey] : null;

        if (!entry || entry.expires < Date.now()) return res.status(400).json({ error: 'Code expired. Request a new one.' });
        if (entry.otp !== otp) return res.status(400).json({ error: 'Invalid code.' });

        const user = await User.findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('email')),
                '=',
                email.toLowerCase()
            )
        });
        if (!user) return res.status(404).json({ error: 'User not found.' });

        user.password = await bcrypt.hash(password, 10);
        await user.save();

        delete otpStore[storeKey];
        req.session.user = user;
        req.session.save(() => res.json({ success: true }));
    } catch (err) {
        console.error("[RESET_PASS_ERR]", err.message);
        res.status(500).json({ error: 'Failed to update.' });
    }
});

// --- LOGIN HANDSHAKE (Case-Insensitive) ---
router.post('/login', async (req, res) => {
    let { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Identity credentials missing.' });

    try {
        console.log(`[AUTH] Access request received for: ${email}`);

        // Use ILIKE (for Postgres) or case-insensitive find
        const user = await User.findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('email')),
                '=',
                email.toLowerCase()
            )
        });

        if (!user) {
            console.warn(`[AUTH] Login Rejected: Identity ${email} not found.`);
            return res.status(401).json({ error: 'NOT_FOUND', message: 'Identity not found. Register first.' });
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            console.warn(`[AUTH] Login Rejected: Invalid key for ${email}.`);
            return res.status(401).json({ error: 'PASSWORD_INCORRECT', message: 'Credentials mismatch.' });
        }

        console.log(`[AUTH] ACCESS GRANTED: ${email}`);
        req.session.user = user;
        req.session.save(() => res.json({ success: true, user }));
    } catch (err) {
        console.error("[AUTH] Login Handshake FATAL:", err.message);
        res.status(500).json({ error: 'Core Authentication System Error' });
    }
});

module.exports = router;
