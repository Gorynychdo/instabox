const log4js = require('log4js');
const server = require('./src/services/http');
const insta = require('./src/clients/insta');

const logger = log4js.getLogger();
logger.level = 'debug';
const client = new insta(logger);
const srv = new server(logger, client);
srv.start();
