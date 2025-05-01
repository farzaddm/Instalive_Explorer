const db = require('./db');
const logger = require('./logger');
const models = require('./models');

module.exports = {
	...db,
	logger,
	...models,
};
