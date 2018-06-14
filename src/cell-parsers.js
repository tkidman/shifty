const { shiftTypesList, findShiftTypeByName } = require('./domain/shift-type');
const hewLevels = require('./domain/hew-level');
const { adjustTimezoneOffset, logger, isNullOrWhitespace } = require('./common');

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
  const { value } = cell;
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
  multipleNameParser: (cell, allStaff) => {
    const names = tryTrimValue(cell);
    const employees = [];
    const errorNames = [];

    names.split(',').forEach((name) => {
      const employee = allStaff[name.trim()];
      if (!employee) {
        errorNames.push(name.trim());
      } else {
        employees.push(employee);
      }
    });
    if (errorNames.length > 0) {
      return { error: `Unable to find staff member with name(s): ${errorNames.join(', ')}` };
    }
    return { value: employees };
  },
  trueFalseParser: (cell) => {
    const value = tryTrimValue(cell);
    if (value) {
      logger.debug(`trueFalse value: ${value}`);
      if (['Y', 'YES', 'TRUE'].some(yes => yes === value.toString().toUpperCase())) {
        return { value: true };
      } else if (['N', 'NO', 'FALSE'].some(no => no === value.toString().toUpperCase())) {
        return { value: false };
      }
      return { error: `Unable to determine true or false from value: ${value}` };
    }
    return { error: 'No value provided' };
  },
  numberParser: (cell) => {
    const { value } = cell;
    if (!isNullOrWhitespace(value) && Number.isInteger(Number(value))) {
      return { value: Number(value) };
    }
    return { error: `${value} is not a number` };
  },
  dateParser: (cell) => {
    const { value } = cell;
    if (value) {
      if (typeof value.getMonth === 'function') {
        return { value: adjustTimezoneOffset(value) };
      } else if (value.result && typeof value.result.getMonth === 'function') {
        return { value: adjustTimezoneOffset(value.result) };
      }
    }
    return { error: `${value} is not a date` };
  },
  shiftTypeParser: (cell) => {
    const value = tryTrimValue(cell);
    if (value) {
      const types = value.split(',');
      const invalidTypes = types.filter(shiftType => !findShiftTypeByName(shiftType));
      if (invalidTypes.length === 0) {
        return { value: types.map(type => findShiftTypeByName(type)) };
      }
      if (invalidTypes.length === 1) {
        return { error: `${invalidTypes[0]} is not a valid shift type. Allowed values: ${shiftTypesList}` };
      }
      return { error: `${invalidTypes.join(', ')} are not valid shift types. Allowed values: ${shiftTypesList}` };
    }
    return { error: `At least one shift type must be provided. Allowed values: ${shiftTypesList}` };
  },
  stringParser: cell => ({ value: tryTrimValue(cell) }),
};

module.exports = parsers;
