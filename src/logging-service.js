const pino = require('pino');

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: {
        colorize: true,
        translateTime: true
    },
    prettifier: require('pino-pretty')
});

module.exports = {
    logger
};
