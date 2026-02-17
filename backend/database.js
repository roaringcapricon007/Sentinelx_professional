const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false,
    define: {
        timestamps: true,
        freezeTableName: true
    }
});

console.log('Database Status: SQLite Engine Ready');

module.exports = sequelize;
