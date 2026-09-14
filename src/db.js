const knex = require('knex');
const knexConfig = require('../knexfile');

// Single shared knex instance for the whole service.
const db = knex(knexConfig);

module.exports = db;
