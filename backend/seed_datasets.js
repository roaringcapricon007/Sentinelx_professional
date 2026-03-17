const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { LogEntry, User } = require('./models');
const sequelize = require('./database');

async function seedDatasets() {
    try {
        console.log('--- DATASET SEEDING INITIALIZED ---');
        await sequelize.sync(); // Ensure tables exist

        const admin = await User.findOne({ where: { email: 'Superadmin@SentinelX.com' } });
        if (!admin) {
            console.error('Super Admin not found. Run server once to seed users first.');
            return;
        }

        const datasetsDir = path.join(__dirname, 'uploads/datasets');
        const folders = ['Linux', 'Windows', 'Apache', 'Android', 'HDFS', 'Zookeeper', 'HPC', 'Proxifier', 'HealthApp', 'Mac', 'OpenSSH', 'Spark', 'Thunderbird', 'BGL', 'Hadoop', 'OpenStack'];

        let totalSeeded = 0;

        for (const folder of folders) {
            const folderPath = path.join(datasetsDir, folder);
            if (!fs.existsSync(folderPath)) continue;

            const files = fs.readdirSync(folderPath);
            const structuredFile = files.find(f => f.endsWith('_structured.csv'));

            if (structuredFile) {
                console.log(`Processing ${folder}...`);
                const content = fs.readFileSync(path.join(folderPath, structuredFile));
                const records = parse(content, {
                    columns: true,
                    skip_empty_lines: true
                });

                // Take a sample of 10 records per dataset to avoid overwhelming the DB but provide diversity
                const sample = records.slice(0, 15);
                
                const logs = sample.map(rec => {
                    let severity = rec.Level || rec.severity || 'INFO';
                    if (severity === 'combo' || !['INFO', 'WARN', 'ERROR', 'CRITICAL'].includes(severity.toUpperCase())) {
                        severity = 'INFO';
                        if (rec.Content && (rec.Content.toLowerCase().includes('fail') || rec.Content.toLowerCase().includes('error'))) {
                            severity = 'ERROR';
                        }
                    }

                    return {
                        severity: severity.toUpperCase(),
                        device: folder,
                        message: rec.Content || rec.Message || rec.Text || 'No message content',
                        ip: rec.rhost || '0.0.0.0',
                        threatType: rec.Component || 'System Metadata',
                        riskScore: severity.toUpperCase() === 'ERROR' ? 45 : (severity.toUpperCase() === 'WARN' ? 20 : 5),
                        status: 'ACTIVE',
                        timestamp: new Date(),
                        UserId: admin.id
                    };
                });

                await LogEntry.bulkCreate(logs);
                totalSeeded += logs.length;
                console.log(`Seeded ${logs.length} logs from ${folder}`);
            }
        }

        console.log(`--- SEEDING COMPLETE: ${totalSeeded} Records Added ---`);
    } catch (err) {
        console.error('Seeding Failed:', err.message);
    } finally {
        process.exit();
    }
}

seedDatasets();
