const _ = require('lodash');

const columnIndiciesLegacy = {
  staffColumns: {
    name: 1,
    hew: 2,
    aal: 3,
    slc: 24,
    reference: 25,
    standard: 26,
  },
  shiftColumns: { date: 1, startTime: 2, endTime: 3, shiftType: 4, manualName: 5, label: 6 },
  negsColumns: { name: 1, date: 2, startTime: 3, endTime: 4 },
  leaveColumns: { name: 1, firstDay: 2, lastDay: 3 },
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
    columnIndiciesLegacy.staffColumns[`${legacyDays[daysIndex]}Start${payweekOrNonPayweek}`] = startColumnIndex;
    columnIndiciesLegacy.staffColumns[`${legacyDays[daysIndex]}End${payweekOrNonPayweek}`] = startColumnIndex + 1;
  }
};

generateLegacyHoursForDaysIndicies();

const generateHoursForDaysKeys = (weekKey) => days.map(day => ({ start: `${day}Start${weekKey}`, end: `${day}End${weekKey}` }));

const generateAllHoursForDaysKeys = () => generateHoursForDaysKeys('P').concat(generateHoursForDaysKeys('N'));

const hoursForDaysKeys = generateAllHoursForDaysKeys();

const loadColumnNamesToIndicies = sheet => {
  const columnsNamesToIndicies = {};
  sheet.getRow(1).eachCell((cell, columnNumber) => {
    if (cell.value) {
      columnsNamesToIndicies[cell.value.replace(/\s+/g, '').toUpperCase()] = columnNumber;
    }
  });
  return columnsNamesToIndicies;
};

const loadIndicies = (sheet, columns) => {
  const columnNamesToIndicies = loadColumnNamesToIndicies(sheet);
  Object.keys(columns).forEach(key => {
    columns[key] = columnNamesToIndicies[key.toUpperCase()];
  });
};

const loadColumnIndicies = (workbook, legacyMode) => {
  if (legacyMode) {
    return columnIndiciesLegacy;
  }
  const columnIndicies = _.cloneDeep(columnIndiciesLegacy);
  loadIndicies(workbook.getWorksheet('Staff'), columnIndicies.staffColumns);
  loadIndicies(workbook.getWorksheet('Shifts'), columnIndicies.shiftColumns);
  loadIndicies(workbook.getWorksheet('Negs'), columnIndicies.negsColumns);
  loadIndicies(workbook.getWorksheet('Leave'), columnIndicies.leaveColumns);
  return columnIndicies;
};

module.exports = { loadColumnIndicies, hoursForDaysKeys };
