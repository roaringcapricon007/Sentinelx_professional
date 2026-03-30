/**
 * --- DEVICE CONNECTIVITY CONTROLLER ---
 * Manages remote agent lifecycle.
 */
exports.registerDevice = (req, res) => {
    const { name } = req.body;
    
    // Generate Secure Neural ID
    const deviceId = "dev_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
    
    res.json({
        success: true,
        deviceId,
        token: "secure_token_" + deviceId,
        metadata: {
            assignedNode: name || "Unidentified_Uplink",
            clearance: "LEVEL_1_FORENSICS",
            heartbeatInterval: 5000
        },
        message: "Device connectivity established 🚀"
    });
};
