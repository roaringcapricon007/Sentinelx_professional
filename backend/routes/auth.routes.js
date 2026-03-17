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

const jwt = require('jsonwebtoken');
const { LoginHistory } = require('../models');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'sentinelx_neural_secret_2026';

// --- LOGIN HANDSHAKE (JWT & Audit Tracking) ---
router.post('/login', async (req, res) => {
    let { email, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ua = req.headers['user-agent'];

    if (!email || !password) return res.status(400).json({ error: 'Identity credentials missing.' });

    try {
        console.log(`[AUTH] Access request received for: ${email} from ${ip}`);

        const user = await User.findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('email')),
                '=',
                email.toLowerCase()
            )
        });

        if (!user) {
            await LoginHistory.create({ ipAddress: ip, userAgent: ua, status: 'FAILED', location: 'Unknown' });
            return res.status(401).json({ error: 'NOT_FOUND', message: 'Identity not found.' });
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            await LoginHistory.create({ UserId: user.id, ipAddress: ip, userAgent: ua, status: 'FAILED' });
            return res.status(401).json({ error: 'PASSWORD_INCORRECT', message: 'Credentials mismatch.' });
        }

        // --- SUCCESSFUL AUTH ---
        await LoginHistory.create({ UserId: user.id, ipAddress: ip, userAgent: ua, status: 'SUCCESS' });

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log(`[AUTH] JWT ISSUED: ${email} [${user.role}]`);
        
        req.session.user = user; // Partial fallback for legacy compat
        req.session.save(() => {
            res.json({ 
                success: true, 
                token, 
                user: { id: user.id, name: user.name, email: user.email, role: user.role } 
            });
        });

    } catch (err) {
        console.error("[AUTH] Login Handshake FATAL:", err.message);
        res.status(500).json({ error: 'Core Authentication System Error' });
    }
});

router.post('/verify-registration', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const entry = otpStore[`reg_${email}`];
        if (!entry || entry.expires < Date.now()) return res.status(400).json({ error: 'Expired' });
        if (entry.otp !== otp) return res.status(400).json({ error: 'Invalid' });

        const { name, password } = entry.userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Auto-assign roles based on sequence or first-user logic
        const userCount = await User.count();
        const role = userCount === 0 ? 'super_admin' : 'analyst';

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            provider: 'local',
            status: 'ENABLED'
        });

        console.log(`[AUTH] Identity PERSISTED: ${email} registered as ${role}.`);
        delete otpStore[`reg_${email}`];
        
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        
        req.session.user = user;
        req.session.save(() => res.json({ success: true, token, user }));
    } catch (err) {
        console.error("[AUTH] Registration Commit Failed:", err);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// --- FORGOT PASSWORD (STABLE v12.0) ---
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email: email.toLowerCase() } });
        if (!user) return res.status(404).json({ error: 'Mail ID not found.' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[`reset_${user.email}`] = { otp, expires: Date.now() + 600000 };

        const mailer = await getTransporter();
        if (mailer) {
            mailer.sendMail({
                from: `"SentinelX Security" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: `Identity Recovery code: ${otp}`,
                html: `<div style="padding: 20px;"><h1>Recovery Code</h1><p>Your OTP is: <b>${otp}</b></p></div>`
            }).catch(err => console.error("[AUTH] Recovery Dispatch Error:", err.message));
        }

        return res.json({ success: true, toast_otp: otp });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { email, otp, password } = req.body;
    try {
        const storeKey = Object.keys(otpStore).find(k => k.toLowerCase() === `reset_${email.toLowerCase()}`);
        const entry = storeKey ? otpStore[storeKey] : null;

        if (!entry || entry.expires < Date.now()) return res.status(400).json({ error: 'Code expired.' });
        if (entry.otp !== otp) return res.status(400).json({ error: 'Invalid code.' });

        const user = await User.findOne({ where: { email: email.toLowerCase() } });
        if (!user) return res.status(404).json({ error: 'User not found.' });

        user.password = await bcrypt.hash(password, 10);
        await user.save();

        delete otpStore[storeKey];
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        req.session.user = user;
        req.session.save(() => res.json({ success: true, token }));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update.' });
    }
});

router.get('/audit', async (req, res) => {
    // Only super_admin or analyst can view audit logs
    const user = req.user || req.session.user;
    if (!user || !['super_admin', 'analyst'].includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const history = await LoginHistory.findAll({
            limit: 50,
            order: [['timestamp', 'DESC']],
            include: [{ model: User, attributes: ['name', 'email'] }]
        });
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
