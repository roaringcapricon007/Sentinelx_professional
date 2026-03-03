const sequelize = require('./database');
const { QueryTypes } = require('sequelize');
sequelize.query("PRAGMA table_info(Server)", { type: QueryTypes.SELECT }).then(cols => {
    console.log('SERVER_COLS_LIST:' + JSON.stringify(cols.map(c => c.name)));
    process.exit(0);
});
