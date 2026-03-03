const sequelize = require('./database');
const { QueryTypes } = require('sequelize');
sequelize.query("PRAGMA table_info(Server)", { type: QueryTypes.SELECT }).then(cols => {
    cols.forEach(c => console.log('COL:' + c.name));
    process.exit(0);
});
