const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Sequelize } = require('sequelize');

const dbDatabase = process.env.DB_DATABASE || 'TaskManager';
const dbUser = process.env.DB_USER !== undefined && process.env.DB_USER !== '' ? process.env.DB_USER : 'sa';
const dbPassword = process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== '' ? process.env.DB_PASSWORD : '123456';
const dbHost = process.env.DB_SERVER || process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT, 10) || 1433;
const dbInstance = process.env.DB_INSTANCE;

const dialectOptions = {
    options: {
        encrypt: false,
        trustServerCertificate: true,
    }
};

if (dbInstance) {
    dialectOptions.options.instanceName = dbInstance;
}

const sequelize = new Sequelize(dbDatabase, dbUser, dbPassword, {
    host: dbHost,
    dialect: 'mssql',
    port: dbPort,
    dialectOptions,
    logging: false,
});

const test = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ SQL Server: Kết nối cơ sở dữ liệu thành công.');
    } catch (error) {
        console.error('❌ SQL Server: Không thể kết nối cơ sở dữ liệu:', error.message);
    }
};

module.exports = { 
    sequelize, 
    test 
};