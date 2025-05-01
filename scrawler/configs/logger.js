const { createLogger, format, transports } = require('winston');

const customLevels = {
  levels: {
    critical: 0,  // Highest priority
    error: 1,
    warn: 2,
    info: 3,
  },
  colors: {
    critical: 'red bold',
    error: 'red',
    warn: 'yellow',
    info: 'green',
  },
};

const logger = createLogger({
  levels: customLevels.levels, // Use custom levels
  level: 'info', // Set the minimum log level
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [
    new transports.Console(), // Console transport
    // new transports.Console({ level: 'warn' }),
    new transports.File({ filename: './logs/error.log', level: 'error' }),
    new transports.File({ filename: './logs/combined.log' }),
    new transports.File({ filename: './logs/critical.log', level: 'critical' })
  ]
});

require('winston').addColors(customLevels.colors);

module.exports = logger;
