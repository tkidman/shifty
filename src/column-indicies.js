const _ = require('lodash');

const columnIndiciesLegacy = {
  staffColumns: {
    name: { index: 1, mandatory: true },
    hew: { index: 2, mandatory: true },
    aal: { index: 3 },
    slc: { index: 24 },
    reference: { index: 25 },
    standard: { index: 26 },
  },
  shiftColumns: {
    date: { index: 1, mandatory: true },
    startTime: { index: 2, mandatory: true },
    endTime: { index: 3, mandatory: true },
    shiftType: { index: 4, mandatory: true },
    manualName: { index: 5 },
    label: { index: 6 },
  },
  negsColumns: {
    name: { index: 1, mandatory: true },
    date: { index: 2, mandatory: true },
    startTime: { index: 3, mandatory: true },
    endTime: { index: 4, mandatory: true },
  },
  leaveColumns: {
    name: { index: 1, mandatory: true },
    firstDay: { index: 2, mandatory: true },
    lastDay: { index: 3, mandatory: true },
  },
};

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const legacyDays = days.slice(0, 5);

const generateLegacyHoursForDaysIndicies = () => {
  // MonStartP: 4, MonEndP: 5 etc
  const startMondayPayweek = 4;
  for (let i = 0; i < legacyDays.length * 2; i++) {
    const payweekOrNonPayweek = (i < legacyDays.length ? 'P' : 'N');
    const daysIndex = (i >= legacyDays.length ? i - legacyDays.length : i);
    const startColumnIndex = startMondayPayweek + (i * 2);
    columnIndiciesLegacy.staffColumns[`${legacyDays[daysIndex]}Start${payweekOrNonPayweek}`] = { index: startColumnIndex };
    columnIndiciesLegacy.staffColumns[`${legacyDays[daysIndex]}End${payweekOrNonPayweek}`] = { index: startColumnIndex + 1 };
  }
};

generateLegacyHoursForDaysIndicies();

const generateHoursForDaysKeys = (weekKey) => days.map(day => ({ start: `${day}Start${weekKey}`, end: `${day}End${weekKey}` }));

const generateAllHoursForDaysKeys = () => generateHoursForDaysKeys('P').concat(generateHoursForDaysKeys('N'));

const hoursForDaysKeys = generateAllHoursForDaysKeys();

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
    columns[key].index = columnNamesToIndicies[key.toUpperCase()];
  });
};

const loadColumnIndicies = (workbook, legacyMode, errors) => {
  if (legacyMode) {
    return columnIndiciesLegacy;
  }
  const columnIndicies = _.cloneDeep(columnIndiciesLegacy);
  loadIndicies(workbook.getWorksheet('Staff'), columnIndicies.staffColumns, errors);
  loadIndicies(workbook.getWorksheet('Shifts'), columnIndicies.shiftColumns, errors);
  loadIndicies(workbook.getWorksheet('Negs'), columnIndicies.negsColumns, errors);
  loadIndicies(workbook.getWorksheet('Leave'), columnIndicies.leaveColumns, errors);
  return columnIndicies;
};

module.exports = { loadColumnIndicies, hoursForDaysKeys };
