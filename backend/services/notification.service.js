/**
 * SentinelX Notification Service v7.5
 * Dispatches critical alerts via Email, Telegram, and WhatsApp stubs.
 */
const nodemailer = require('nodemailer');

// --- Email Transport (Gmail via App Password) ---
let transporter = null;
try {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, '')
        }
    });
    console.log('[NOTIFY] Email transport initialized.');
} catch (e) {
    console.warn('[NOTIFY] Email transport failed to initialize:', e.message);
}

/**
 * Send Email Alert for Critical Incidents
 */
async function sendEmailAlert(log, ipIntel) {
    if (!transporter || !process.env.EMAIL_USER) {
        console.log('[NOTIFY] Email skipped — no credentials configured.');
        return;
    }

    const subject = `🚨 SentinelX CRITICAL ALERT #${log.id} — ${log.severity}`;
    const html = `
    <div style="font-family: 'Segoe UI', sans-serif; background: #0a0e1a; color: #e0e6ed; padding: 30px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #00d4ff; font-size: 28px; margin: 0;">SentinelX Alert</h1>
            <p style="color: #8b9bb4;">Automated Security Notification</p>
        </div>
        <div style="background: rgba(255,0,85,0.1); border-left: 4px solid #ff0055; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #ff0055; margin: 0 0 10px 0;">⚠ ${log.severity} Level Incident Detected</h3>
            <p style="margin: 5px 0;"><strong>Alert ID:</strong> #VX-${String(log.id).padStart(3, '0')}</p>
            <p style="margin: 5px 0;"><strong>Device:</strong> ${log.device || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Source IP:</strong> ${log.ip || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Risk Score:</strong> ${log.riskScore} points</p>
            <p style="margin: 5px 0;"><strong>Attempts:</strong> ${log.attempts || 1}</p>
        </div>
        <div style="background: rgba(0,212,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="color: #00d4ff; margin: 0 0 10px 0;">📋 Event Details</h4>
            <p style="margin: 5px 0;">${log.message}</p>
            <p style="margin: 5px 0; color: #8b9bb4; font-style: italic;">${log.suggestion || ''}</p>
        </div>
        ${ipIntel ? `
        <div style="background: rgba(255,204,0,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="color: #ffcc00; margin: 0 0 10px 0;">🌍 Geographic Intelligence</h4>
            <p style="margin: 5px 0;"><strong>Country:</strong> ${ipIntel.country || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>City:</strong> ${ipIntel.city || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Threat Level:</strong> ${ipIntel.risk || 'N/A'}</p>
        </div>` : ''}
        <div style="text-align: center; padding: 20px; color: #555; font-size: 12px;">
            <p>This is an automated alert from SentinelX Professional v7.5</p>
            <p>Login to your dashboard to take action.</p>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"SentinelX Alert System" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to self (admin inbox)
            subject,
            html
        });
        console.log(`[NOTIFY] ✅ Email alert dispatched for Incident #${log.id}`);
    } catch (e) {
        console.error(`[NOTIFY] ❌ Email dispatch failed: ${e.message}`);
    }
}

/**
 * Telegram Bot Alert (Stub — requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env)
 */
async function sendTelegramAlert(log) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.log('[NOTIFY] Telegram skipped — no bot token/chat ID configured.');
        return;
    }

    const text = `🚨 *SentinelX Alert #${log.id}*\n\n*Severity:* ${log.severity}\n*Device:* ${log.device || 'System'}\n*IP:* ${log.ip || 'N/A'}\n*Risk:* ${log.riskScore} pts\n\n${log.message}\n\n_${log.suggestion || ''}_`;

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        // Using dynamic import for fetch in Node.js (or use axios)
        const axios = require('axios');
        await axios.post(url, {
            chat_id: chatId,
            text,
            parse_mode: 'Markdown'
        });
        console.log(`[NOTIFY] ✅ Telegram alert sent for Incident #${log.id}`);
    } catch (e) {
        console.error(`[NOTIFY] ❌ Telegram dispatch failed: ${e.message}`);
    }
}

/**
 * Master Dispatcher — calls all configured channels
 */
async function dispatchCriticalAlert(log, ipIntel) {
    console.log(`[ALERT_DISPATCH] 🔴 CRITICAL INCIDENT #${log.id} — Risk: ${log.riskScore} — Source: ${log.ip}`);

    // Fire all channels in parallel (non-blocking)
    await Promise.allSettled([
        sendEmailAlert(log, ipIntel),
        sendTelegramAlert(log)
    ]);
}

module.exports = {
    dispatchCriticalAlert,
    sendEmailAlert,
    sendTelegramAlert
};
