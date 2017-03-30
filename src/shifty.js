const Excel = require('exceljs');
const Shift = require('./domain/shift').Shift;
const shiftTypes = require('./domain/shift-type').shiftTypes;
const Employee = require('./domain/employee');
const Roster = require('./domain/roster');
const parsers = require('./cell-parsers');
const logger = require('./common').logger;
const moment = require('moment');
const isNullOrWhitespace = require('./common').isNullOrWhitespace;

const staffColumns = {
  name: 1,
  hewLevel: 2,
  aal: 3,
  startMondayPayweek: 4,
  startMondayNonPayweek: 14,
  endFridayNonPayweek: 23,
  slc: 24,
  reference: 25,
  standard: 26,
};

const shiftColumns = { day: 1, start: 2, end: 3, type: 4, manualName: 5, label: 6 };
const negsColumns = { name: 1, day: 2, start: 3, end: 4 };
const leaveColumns = { name: 1, firstDay: 2, lastDay: 3 };
const worksheets = { shifts: 1, staff: 2, negs: 3, leave: 4 };

const daysByColumn = { 4: 'Mon', 6: 'Tue', 8: 'Wed', 10: 'Thu', 12: 'Fri' };

const addTime = (day, time) => {
  const dateTime = new Date(day);
  dateTime.setHours(time.getHours());
  dateTime.setMinutes(time.getMinutes());
  return dateTime;
};

const tryLoadParamValue = (params, paramName, cell, errors, allStaff, parseFunction) => {
  const parseResult = parseFunction(cell, allStaff);
  if (parseResult.error) {
    errors.push(`Failed to load '${paramName}' for cell ${cell._address} in ${cell._row._worksheet.name} sheet. ` +
      `Value: ${cell.value}, error: ${parseResult.error}`);
  } else {
    params[paramName] = parseResult.value;
  }
  return params;
};

const tryLoadValue = (paramName, cell, errors, allStaff, parseFunction) =>
  tryLoadParamValue({}, paramName, cell, errors, allStaff, parseFunction)[paramName];

const tryLoadBoolean = (paramName, cell, errors, allStaff, parseFunction, returnThisIfNull) => {
  if (isNullOrWhitespace(cell.value) && returnThisIfNull !== undefined) {
    return returnThisIfNull;
  }
  return tryLoadParamValue({}, paramName, cell, errors, allStaff, parseFunction)[paramName];
};

const loadStaffHoursByDayOfWeek = (row, errors, allStaff) => {
  const hoursByDayOfWeek = { payweek: {}, nonPayweek: {} };
  for (let i = staffColumns.startMondayPayweek; i <= staffColumns.endFridayNonPayweek; i += 2) {
    if (!isNullOrWhitespace(row.getCell(i).value)) {
      const startIndex = i;
      const endIndex = i + 1;
      const start = tryLoadValue('start', row.getCell(startIndex), errors, allStaff, parsers.dateParser);
      const end = tryLoadValue('end', row.getCell(endIndex), errors, allStaff, parsers.dateParser);
      if (endIndex < staffColumns.startMondayNonPayweek) {
        hoursByDayOfWeek.payweek[daysByColumn[startIndex]] = { start, end };
      } else {
        hoursByDayOfWeek.nonPayweek[daysByColumn[i - 10]] = { start, end };
      }
    }
  }
  return hoursByDayOfWeek;
};

const loadStaff = (workbook, errors) => {
  const metricStart = moment();
  const staffSheet = workbook.getWorksheet(worksheets.staff);
  const allStaff = {};
  staffSheet.eachRow((row, rowNumber) => {
    const staffParams = { shiftTypes: [shiftTypes.backup] };
    if (rowNumber > 1) {
      staffParams.name = row.getCell(staffColumns.name).value;

      tryLoadParamValue(
        staffParams, 'hewLevel', row.getCell(staffColumns.hewLevel), errors, allStaff, parsers.hewLevelParser
      );

      if (tryLoadBoolean('aal', row.getCell(staffColumns.aal), errors, allStaff, parsers.trueFalseParser, false)) {
        staffParams.shiftTypes.push(shiftTypes.aal);
      }
      if (tryLoadBoolean('slc', row.getCell(staffColumns.slc), errors, allStaff, parsers.trueFalseParser, false)) {
        staffParams.shiftTypes.push(shiftTypes.slc);
      }
      if (tryLoadBoolean('reference', row.getCell(staffColumns.reference), errors, allStaff, parsers.trueFalseParser, false)) {
        staffParams.shiftTypes.push(shiftTypes.reference);
      }
      if (tryLoadBoolean('standard', row.getCell(staffColumns.standard), errors, allStaff, parsers.trueFalseParser, true)) {
        staffParams.shiftTypes.push(shiftTypes.standard);
      }

      staffParams.hoursByDayOfWeek = loadStaffHoursByDayOfWeek(row, errors, allStaff);
      allStaff[staffParams.name] = new Employee(staffParams);
    }
  });
  logger.info(`loadStaff time taken: ${moment().diff(metricStart)}`);
  return allStaff;
};

const loadShifts = (workbook, allStaff, errors) => {
  const metricStart = moment();
  const shiftsSheet = workbook.getWorksheet(worksheets.shifts);
  const shifts = [];
  let day;
  shiftsSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      if (!isNullOrWhitespace(row.getCell(shiftColumns.day).value)) {
        day = tryLoadValue('day', row.getCell(shiftColumns.day), errors, allStaff, parsers.dateParser);
      }
      const startTime = tryLoadValue('startTime', row.getCell(shiftColumns.start), errors, allStaff, parsers.dateParser);
      const endTime = tryLoadValue('endTime', row.getCell(shiftColumns.end), errors, allStaff, parsers.dateParser);
      const start = addTime(day, startTime);
      const end = addTime(day, endTime);
      const type = tryLoadValue('shiftType', row.getCell(shiftColumns.type), errors, allStaff, parsers.shiftTypeParser);
      const label = row.getCell(shiftColumns.label).value;
      const shift = new Shift({ type, start, end, label });
      const manualNameCell = row.getCell(shiftColumns.manualName);
      if (!isNullOrWhitespace(manualNameCell.value)) {
        const name = tryLoadValue('manualName', manualNameCell, errors, allStaff, parsers.nameParser);
        if (name) {
          shift.allocateShift(allStaff[name]);
        }
      }
      shifts.push(shift);
    }
  });
  logger.info(`loadShifts time taken: ${moment().diff(metricStart)}`);
  return shifts;
};

const loadNegs = (workbook, allStaff, errors) => {
  const metricStart = moment();
  const negsSheet = workbook.getWorksheet(worksheets.negs);
  negsSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const name = tryLoadValue('name', row.getCell(negsColumns.name), errors, allStaff, parsers.nameParser);
      const day = tryLoadValue('day', row.getCell(negsColumns.day), errors, allStaff, parsers.dateParser);
      const startTime = tryLoadValue('startTime', row.getCell(negsColumns.start), errors, allStaff, parsers.dateParser);
      const endTime = tryLoadValue('endTime', row.getCell(negsColumns.end), errors, allStaff, parsers.dateParser);
      const start = addTime(day, startTime);
      const end = addTime(day, endTime);
      allStaff[name].negs.push({ start, end });
    }
  });
  logger.info(`loadNegs time taken: ${moment().diff(metricStart)}`);
};

const loadLeave = (workbook, allStaff, errors) => {
  const metricStart = moment();
  const leaveSheet = workbook.getWorksheet(worksheets.leave);
  leaveSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const name = tryLoadValue('name', row.getCell(leaveColumns.name), errors, allStaff, parsers.nameParser);
      const firstDay = tryLoadValue('firstDay', row.getCell(leaveColumns.firstDay), errors, allStaff, parsers.dateParser);
      if (firstDay && name) {
        const leave = { start: moment(firstDay).startOf('day').toDate() };
        if (!isNullOrWhitespace(row.getCell(leaveColumns.lastDay).value)) {
          const lastDay = tryLoadValue('lastDay', row.getCell(leaveColumns.lastDay), errors, allStaff, parsers.dateParser);
          leave.end = moment(lastDay).endOf('day').toDate();
        } else {
          leave.end = moment(firstDay).endOf('day').toDate();
        }
        allStaff[name].leave.push(leave);
      }
    }
  });
  logger.info(`loadLeave time taken: ${moment().diff(metricStart)}`);
};

const doRun = (workbook) => {
  const metricStart = moment();
  const errors = [];
  const allStaff = loadStaff(workbook, errors);
  loadNegs(workbook, allStaff, errors);
  loadLeave(workbook, allStaff, errors);
  const shifts = loadShifts(workbook, allStaff, errors);
  if (errors.length > 0) {
    logger.info(`Errors found in spreadsheet: ${errors.join('\n')}`);
    return { errors };
  }
  const roster = new Roster({ shifts, employees: allStaff });
  roster.fillShifts();
  logger.info(`doRun time taken: ${moment().diff(metricStart)}`);
  return { roster };
};

const run = (fullFilename) => {
  const metricStart = moment();
  const workbook = new Excel.Workbook();
  logger.info('about to load workbork');
  return workbook.xlsx.readFile(fullFilename)
    .then(() => {
      logger.info(`time taken to load workbook: ${moment().diff(metricStart)}`);
      return doRun(workbook);
    })
    .catch((err) => {
      logger.error(err);
      return { exception: err };
    });
};

module.exports = { run, parsers };
