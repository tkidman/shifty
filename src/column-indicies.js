const columnIndiciesLegacy = {
  staffColumns: {
    name: 1,
    hewLevel: 2,
    aal: 3,
    slc: 24,
    reference: 25,
    standard: 26,
  },
  shiftColumns: { day: 1, start: 2, end: 3, type: 4, manualName: 5, label: 6 },
  negsColumns: { name: 1, day: 2, start: 3, end: 4 },
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

const loadColumnIndicies = (workbook, legacy) => {
  if (legacy) {
    return columnIndiciesLegacy;
  }
  return null;
};

module.exports = { loadColumnIndicies, hoursForDaysKeys };
