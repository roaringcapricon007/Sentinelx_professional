const router = require('express').Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;

const bcrypt = require('bcryptjs');
const { User } = require('../models');

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

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 4);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'User',
            provider: 'local'
        });

        req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
        res.json({ message: 'Registration successful', user: req.session.user });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const adminEmail = 'Admin@senitnelX.com';
        const adminPass = 'SentinelXadmin007';

        // 1. Check for Admin Override (Exact Match)
        if (email === adminEmail && password === adminPass) {
            const admin = await User.findOne({ where: { email: adminEmail } });
            req.session.user = { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
            return res.json({ message: 'Admin Login successful', user: req.session.user });
        }

        // 2. Client Flow
        let user = await User.findOne({ where: { email } });

        if (!user) {
            // "store the credentials in database once if they login"
            // Auto-register Client if not found
            const hashedPassword = await bcrypt.hash(password, 4);
            user = await User.create({
                name: email.split('@')[0], // Generate a name from email
                email,
                password: hashedPassword,
                role: 'Client',
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


// GET /api/auth/logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/?logout=true');
    });
});

module.exports = router;
