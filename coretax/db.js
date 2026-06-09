const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.CORETAX_DB_HOST || 'localhost',
  port: parseInt(process.env.CORETAX_DB_PORT || '5432', 10),
  database: process.env.CORETAX_DB_NAME || 'adempiere',
  user: process.env.CORETAX_DB_USER || 'adempiere',
  password: process.env.CORETAX_DB_PASSWORD || 'adempiere',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = pool;
