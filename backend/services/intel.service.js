const geoip = require('geoip-lite');

/**
 * --- NEURAL INTELLIGENCE SERVICE (v10.0) ---
 * Provides IP geo-location and threat-actor profiling.
 */
function getIpIntelligence(ip) {
    if (!ip || ip === '127.0.0.1' || ip === '::1') {
        return { city: 'LOCAL_NEXUS', country: 'MATRIX', risk: 'SAFE' };
    }

    const geo = geoip.lookup(ip);
    
    // Logic: Identify high-risk origin zones (Simplified for demo)
    const riskZones = ['CN', 'RU', 'KP', 'IR'];
    const riskLevel = geo && riskZones.includes(geo.country) ? 'SUSPICIOUS' : 'SAFE';

    return {
        city: geo ? geo.city : 'Unknown',
        country: geo ? geo.country : 'Unknown',
        ll: geo ? geo.ll : [0, 0],
        risk: riskLevel
    };
}

module.exports = { getIpIntelligence };
