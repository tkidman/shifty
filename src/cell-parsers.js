const shiftTypesList = require('./domain/shift-type').shiftTypesList;
const hewLevels = require('./domain/hew-level');
const adjustTimezoneOffset = require('./common').adjustTimezoneOffset;

const hewLevelsByNumber = {
  3: hewLevels.hewLevel3,
  4: hewLevels.hewLevel4,
  5: hewLevels.hewLevel5,
  6: hewLevels.hewLevel6,
  7: hewLevels.hewLevel7,
  8: hewLevels.hewLevel8,
  9: hewLevels.hewLevel9,
};

const parsers = {
  hewLevelParser: (cell) => {
    const value = hewLevelsByNumber[cell.value];
    if (!value) {
      return { error: `Unable to find hew level for value: ${cell.value}` };
    }
    return { value };
  },
  nameParser: (cell, allStaff) => {
    const name = cell.value;
    if (!allStaff[name]) {
      return { error: `Unable to find staff member with name: ${name}` };
    }
    return { value: name };
  },
  trueFalseParser: (cell) => {
    const value = cell.value;
    if (value) {
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
    const value = cell.value;
    if (value && shiftTypesList.includes(value)) {
      return { value };
    }
    return { error: `${value} is not a valid shift type. Allowed values: ${shiftTypesList}` };
  },
};

module.exports = parsers;
