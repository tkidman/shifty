const moment = require('moment');
const logger = require('winston');
logger.level = 'debug';

const adjustTimezoneOffset = (date) => new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
const dateString = (date) => moment(date).format('D/M/YYYY HH:mm');
const timeString = (date) => moment(date).format('HH:mm');
module.exports = { adjustTimezoneOffset, dateString, timeString, logger };
