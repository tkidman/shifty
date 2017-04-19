const shiftTypesList = require('./domain/shift-type').shiftTypesList;
const hewLevels = require('./domain/hew-level');
const adjustTimezoneOffset = require('./common').adjustTimezoneOffset;
const logger = require('./common').logger;

const hewLevelsByNumber = {
  3: hewLevels.hewLevel3,
  4: hewLevels.hewLevel4,
  5: hewLevels.hewLevel5,
  6: hewLevels.hewLevel6,
  7: hewLevels.hewLevel7,
  8: hewLevels.hewLevel8,
  9: hewLevels.hewLevel9,
};

const tryTrimValue = (cell) => {
  const value = cell.value;
  if (value && typeof value === 'string') {
    return value.trim();
  }
  return value;
};

const parsers = {
  hewLevelParser: (cell) => {
    const hewLevel = hewLevelsByNumber[tryTrimValue(cell)];
    if (!hewLevel) {
      return { error: `Unable to find hew level for value: ${cell.value}` };
    }
    return { value: hewLevel };
  },
  nameParser: (cell, allStaff) => {
    const name = tryTrimValue(cell);
    if (!allStaff[name]) {
      return { error: `Unable to find staff member with name: ${name}` };
    }
    return { value: name };
  },
  trueFalseParser: (cell) => {
    const value = tryTrimValue(cell);
    if (value) {
      logger.debug(`trueFalse value: ${value}`);
      if (['Y', 'YES', 'TRUE'].some(yes => yes === value.toUpperCase())) {
        return { value: true };
      } else if (['N', 'NO', 'FALSE'].some(no => no === value.toUpperCase())) {
        return { value: false };
      }
      return { error: `Unable to determine true or false from value: ${value}` };
    }
    return { error: 'No value provided' };
  },
  numberParser: (cell) => {
    const value = cell.value;
    if (value && !isNaN(value)) {
      return { value: Number(value) };
    }
    return { error: `${value} is not a number` };
  },
  dateParser: (cell) => {
    const value = cell.value;
    if (value && typeof value.getMonth === 'function') {
      return { value: adjustTimezoneOffset(value) };
    }
    return { error: `${value} is not a date` };
  },
  shiftTypeParser: (cell) => {
    const value = tryTrimValue(cell);
    if (value && shiftTypesList.includes(value)) {
      return { value };
    }
    return { error: `${value} is not a valid shift type. Allowed values: ${shiftTypesList}` };
  },
};

module.exports = parsers;
