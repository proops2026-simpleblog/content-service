// Knex configuration for content-service.
// Connection is driven entirely by DATABASE_URL (see .env) so no
// environment-specific values are hardcoded here.
require('dotenv').config();

/** @type {import('knex').Knex.Config} */
module.exports = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
};
