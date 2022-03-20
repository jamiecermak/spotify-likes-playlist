const winston = require('winston')

module.exports = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'spotify-likes-playlist' },
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
})
