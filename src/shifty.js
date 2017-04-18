const Excel = require('exceljs');
const Shift = require('./domain/shift').Shift;
const shiftTypes = require('./domain/shift-type').shiftTypes;
const Employee = require('./domain/employee');
const Roster = require('./domain/roster');
const ShiftAllocation = require('./domain/shift-allocation');
const parsers = require('./cell-parsers');
const logger = require('./common').logger;
const moment = require('moment');
const isNullOrWhitespace = require('./common').isNullOrWhitespace;
const loadColumnIndicies = require('./column-indicies').loadColumnIndicies;
const hoursForDaysKeys = require('./column-indicies').hoursForDaysKeys;


const worksheets = { shifts: 1, staff: 2, negs: 3, leave: 4 };

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

const loadStaffHoursByDayOfWeek = (row, errors, allStaff, staffColumns) => {
  const hoursByDayOfWeek = { payweek: {}, nonPayweek: {} };

  hoursForDaysKeys.forEach(key => {
    const startIndex = staffColumns[key.start];
    const endIndex = staffColumns[key.end];
    const day = key.start.slice(0, 3);
    if (startIndex && !isNullOrWhitespace(row.getCell(startIndex).value)) {
      const start = tryLoadValue('start', row.getCell(startIndex), errors, allStaff, parsers.dateParser);
      const end = tryLoadValue('end', row.getCell(endIndex), errors, allStaff, parsers.dateParser);
      if (key.start[key.start.length - 1] === 'P') {
        hoursByDayOfWeek.payweek[day] = { start, end };
      } else {
        hoursByDayOfWeek.nonPayweek[day] = { start, end };
      }
    }
  });
  return hoursByDayOfWeek;
};

const loadStaff = (workbook, errors, columnIndicies) => {
  const metricStart = moment();
  const staffSheet = workbook.getWorksheet(worksheets.staff);
  const allStaff = {};
  const staffColumns = columnIndicies.staffColumns;

  staffSheet.eachRow((row, rowNumber) => {
    const staffParams = { shiftTypes: [shiftTypes.backup] };
    if (rowNumber > 1) {
      staffParams.name = row.getCell(staffColumns.name).value;

      tryLoadParamValue(
        staffParams, 'hew', row.getCell(staffColumns.hew), errors, allStaff, parsers.hewLevelParser
      );
      staffParams.hewLevel = staffParams.hew;

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

      staffParams.hoursByDayOfWeek = loadStaffHoursByDayOfWeek(row, errors, allStaff, staffColumns);
      allStaff[staffParams.name] = new Employee(staffParams);
    }
  });
  logger.info(`loadStaff time taken: ${moment().diff(metricStart)}`);
  return allStaff;
};

const loadShifts = (workbook, allStaff, errors, columnIndicies) => {
  const metricStart = moment();
  const shiftsSheet = workbook.getWorksheet(worksheets.shifts);
  const shiftColumns = columnIndicies.shiftColumns;
  const shifts = [];
  let day;
  shiftsSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      if (!isNullOrWhitespace(row.getCell(shiftColumns.date).value)) {
        day = tryLoadValue('date', row.getCell(shiftColumns.date), errors, allStaff, parsers.dateParser);
      }
      const startTime = tryLoadValue('startTime', row.getCell(shiftColumns.startTime), errors, allStaff, parsers.dateParser);
      const endTime = tryLoadValue('endTime', row.getCell(shiftColumns.endTime), errors, allStaff, parsers.dateParser);
      const start = addTime(day, startTime);
      const end = addTime(day, endTime);
      const type = tryLoadValue('shiftType', row.getCell(shiftColumns.shiftType), errors, allStaff, parsers.shiftTypeParser);
      const label = row.getCell(shiftColumns.label).value;
      const shift = new Shift({ type, start, end, label });
      const manualNameCell = row.getCell(shiftColumns.manualName);
      if (!isNullOrWhitespace(manualNameCell.value)) {
        const name = tryLoadValue('manualName', manualNameCell, errors, allStaff, parsers.nameParser);
        if (name) {
          shift.allocateShift(new ShiftAllocation(shift, allStaff[name]));
        }
      }
      shifts.push(shift);
    }
  });
  logger.info(`loadShifts time taken: ${moment().diff(metricStart)}`);
  return shifts;
};

const loadNegs = (workbook, allStaff, errors, columnIndicies) => {
  const metricStart = moment();
  const negsSheet = workbook.getWorksheet(worksheets.negs);
  const negsColumns = columnIndicies.negsColumns;

  negsSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const name = tryLoadValue('name', row.getCell(negsColumns.name), errors, allStaff, parsers.nameParser);
      const day = tryLoadValue('date', row.getCell(negsColumns.date), errors, allStaff, parsers.dateParser);
      const startTime = tryLoadValue('startTime', row.getCell(negsColumns.startTime), errors, allStaff, parsers.dateParser);
      const endTime = tryLoadValue('endTime', row.getCell(negsColumns.endTime), errors, allStaff, parsers.dateParser);
      const start = addTime(day, startTime);
      const end = addTime(day, endTime);
      allStaff[name].negs.push({ start, end });
    }
  });
  logger.info(`loadNegs time taken: ${moment().diff(metricStart)}`);
};

const loadLeave = (workbook, allStaff, errors, columnIndicies) => {
  const metricStart = moment();
  const leaveSheet = workbook.getWorksheet(worksheets.leave);
  const leaveColumns = columnIndicies.leaveColumns;
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

const doRun = (workbook, legacyMode) => {
  const metricStart = moment();
  const errors = [];
  const columnIndicies = loadColumnIndicies(workbook, legacyMode);
  const allStaff = loadStaff(workbook, errors, columnIndicies);
  loadNegs(workbook, allStaff, errors, columnIndicies);
  loadLeave(workbook, allStaff, errors, columnIndicies);
  const shifts = loadShifts(workbook, allStaff, errors, columnIndicies);
  if (errors.length > 0) {
    logger.info(`Errors found in spreadsheet: ${errors.join('\n')}`);
    return { errors };
  }
  const roster = new Roster({ shifts, employees: allStaff });
  roster.fillShifts();
  logger.info(`doRun time taken: ${moment().diff(metricStart)}`);
  return { roster };
};

const run = (fullFilename, legacyMode) => {
  const metricStart = moment();
  const workbook = new Excel.Workbook();
  logger.info('about to load workbork');
  return workbook.xlsx.readFile(fullFilename)
    .then(() => {
      logger.info(`time taken to load workbook: ${moment().diff(metricStart)}`);
      return doRun(workbook, legacyMode);
    })
    .catch((err) => {
      logger.error(err);
      return { exception: err };
    });
};

module.exports = { run, parsers };
