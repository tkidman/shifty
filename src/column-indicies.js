const _ = require('lodash');

const columnIndiciesTemplate = {
  staffColumns: {
    name: { mandatory: true },
    hew: { mandatory: true },
    aal: {},
    slc: {},
    reference: {},
    standard: {},
    bEast: {},
    break: {},
  },
  shiftColumns: {
    date: { mandatory: true },
    startTime: { mandatory: true },
    endTime: { mandatory: true },
    shiftType: { mandatory: true },
    manualName: {},
    label: {},
  },
  negsColumns: {
    name: { mandatory: true },
    date: { mandatory: true },
    startTime: { mandatory: true },
    endTime: { mandatory: true },
  },
  leaveColumns: {
    name: { mandatory: true },
    firstDay: { mandatory: true },
    lastDay: { mandatory: true },
  },
};

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hoursForDaysKeys = [];

const generateHoursForDaysIndiciesTemplate = (weekPostfixChar) => {
  // MonStartP: 4, MonEndP: 5 etc
  days.forEach(day => {
    const startKey = `${day}Start${weekPostfixChar}`;
    const endKey = `${day}End${weekPostfixChar}`;
    columnIndiciesTemplate.staffColumns[startKey] = {};
    columnIndiciesTemplate.staffColumns[endKey] = {};
    hoursForDaysKeys.push({ start: startKey, end: endKey });
  });
};

const generateHoursForDaysIndicies = () => {
  generateHoursForDaysIndiciesTemplate('P');
  generateHoursForDaysIndiciesTemplate('N');
};

generateHoursForDaysIndicies();

const loadColumnNamesToIndicies = (sheet, columns, errors) => {
  const columnsNamesToIndicies = {};
  const columnKeys = Object.keys(columns).map(key => key.toUpperCase());
  sheet.getRow(1).eachCell((cell, columnNumber) => {
    if (cell.value) {
      const upperColumnName = cell.value.replace(/\s+/g, '').toUpperCase();
      if (columnKeys.includes(upperColumnName)) {
        columnsNamesToIndicies[upperColumnName] = columnNumber;
      } else {
        errors.push(`Unexpected column named '${cell.value}' found in sheet '${sheet.name}'`);
      }
    }
  });
  return columnsNamesToIndicies;
};

const loadIndicies = (sheet, columns, errors) => {
  const columnNamesToIndicies = loadColumnNamesToIndicies(sheet, columns, errors);
  Object.keys(columns).forEach(key => {
    const columnIndex = columnNamesToIndicies[key.toUpperCase()];
    if (!columnIndex) {
      columns[key].index = null;
      if (columns[key].mandatory) {
        errors.push(`Mandatory column '${key}' not found in sheet '${sheet.name}'`);
      }
    } else {
      columns[key].index = columnIndex;
    }
  });
};

const loadColumnIndicies = (workbook, errors) => {
  const columnIndicies = _.cloneDeep(columnIndiciesTemplate);
  loadIndicies(workbook.getWorksheet('Staff'), columnIndicies.staffColumns, errors);
  loadIndicies(workbook.getWorksheet('Shifts'), columnIndicies.shiftColumns, errors);
  loadIndicies(workbook.getWorksheet('Negs'), columnIndicies.negsColumns, errors);
  loadIndicies(workbook.getWorksheet('Leave'), columnIndicies.leaveColumns, errors);
  return columnIndicies;
};

module.exports = { loadColumnIndicies, hoursForDaysKeys };
