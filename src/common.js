const adjustTimezoneOffset = (date) => new Date(date.valueOf() + date.getTimezoneOffset() * 60000);

module.exports = { adjustTimezoneOffset };
