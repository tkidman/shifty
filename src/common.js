const moment = require('moment');
const logger = require('winston');
logger.level = 'info';
const numeral = require('numeral');

const common = {
  logger,
  adjustTimezoneOffset: (date) => new Date(date.valueOf() + date.getTimezoneOffset() * 60000),
  dateString: (date) => moment(date).format('D/M/YYYY HH:mm'),
  timeString: (date) => moment(date).format('HH:mm'),
  sameDay: (date1, date2) => moment(date1).isSame(date2, 'day'),
  isNullOrWhitespace: value => (value === null || value === undefined) || !value.toString().trim(),
  formatNumber: (number) => numeral(number).format('0.[00]'),
};

const initialMondayPayweek = moment(common.adjustTimezoneOffset(new Date('2017-03-13T00:00:00')));
common.isInPayweek = (date) => initialMondayPayweek.diff(date, 'week') % 2 === 0;

module.exports = common;

