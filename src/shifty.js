const Excel = require('exceljs');
const { Shift } = require('./domain/shift');
const { shiftTypes } = require('./domain/shift-type');
const Employee = require('./domain/employee');
const Roster = require('./domain/roster');
const ShiftAllocation = require('./domain/shift-allocation');
const parsers = require('./cell-parsers');
const { logger, isNullOrWhitespace } = require('./common');
const moment = require('moment');
const { loadColumnIndicies, hoursForDaysKeys } = require('./column-indicies');
const sheetNames = require('./sheet-names');
const { Unavailability, unavailabilityTypes } = require('./domain/unavailability');

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

const tryLoadNullableValue = (paramName, columnIndex, errors, allStaff, parseFunction, returnThisIfNull, row) => {
  if (!columnIndex.index) {
    return returnThisIfNull;
  }
  const cell = row.getCell(columnIndex.index);
  if (isNullOrWhitespace(cell.value)) {
    return returnThisIfNull;
  }

  return tryLoadParamValue({}, paramName, cell, errors, allStaff, parseFunction)[paramName];
};

const extractIndex = columnIndex => (columnIndex ? columnIndex.index : null);

const loadStaffHoursByDayOfWeek = (row, errors, allStaff, staffColumns) => {
  const hoursByDayOfWeek = { payweek: {}, nonPayweek: {} };

  hoursForDaysKeys.forEach((key) => {
    const startIndex = extractIndex(staffColumns[key.start]);
    const endIndex = extractIndex(staffColumns[key.end]);
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

const applyResponsibleOfficer = (ro, staffParams) => {
  if (ro || (ro === null && staffParams.hewLevel && staffParams.hewLevel.responsibleOfficer)) {
    staffParams.shiftTypes.push(shiftTypes.responsibleOfficer);
  }
};

const loadStaff = (workbook, errors, columnIndicies) => {
  const metricStart = moment();
  const staffSheet = workbook.getWorksheet(sheetNames.staff);
  const allStaff = {};
  const { staffColumns } = columnIndicies;

  staffSheet.eachRow((row, rowNumber) => {
    const staffParams = { shiftTypes: [shiftTypes.backup] };
    if (rowNumber > 1) {
      staffParams.name = row.getCell(staffColumns.name.index).value;

      tryLoadParamValue(staffParams, 'hewLevel', row.getCell(staffColumns.hew.index), errors, allStaff, parsers.hewLevelParser);
      staffParams.breakTime =
        tryLoadNullableValue('break', staffColumns.break, errors, allStaff, parsers.numberParser, undefined, row);

      if (tryLoadNullableValue('aal', staffColumns.aal, errors, allStaff, parsers.trueFalseParser, false, row)) {
        staffParams.shiftTypes.push(shiftTypes.aal);
      }
      if (tryLoadNullableValue('slc', staffColumns.slc, errors, allStaff, parsers.trueFalseParser, false, row)) {
        staffParams.shiftTypes.push(shiftTypes.slc);
      }
      if (tryLoadNullableValue('reference', staffColumns.reference, errors, allStaff, parsers.trueFalseParser, false, row)) {
        staffParams.shiftTypes.push(shiftTypes.reference);
      }
      if (tryLoadNullableValue('bEast', staffColumns.bEast, errors, allStaff, parsers.trueFalseParser, false, row)) {
        staffParams.shiftTypes.push(shiftTypes.bEast);
      }
      if (tryLoadNullableValue('standard', staffColumns.standard, errors, allStaff, parsers.trueFalseParser, true, row)) {
        staffParams.shiftTypes.push(shiftTypes.standard);
      }
      const ro = tryLoadNullableValue('ro', staffColumns.ro, errors, allStaff, parsers.trueFalseParser, null, row);
      applyResponsibleOfficer(ro, staffParams);
      staffParams.hoursByDayOfWeek = loadStaffHoursByDayOfWeek(row, errors, allStaff, staffColumns);
      if (errors.length === 0) {
        allStaff[staffParams.name] = new Employee(staffParams);
      }
    }
  });
  logger.info(`loadStaff time taken: ${moment().diff(metricStart)}`);
  return allStaff;
};

const loadShifts = (workbook, allStaff, errors, columnIndicies) => {
  const metricStart = moment();
  const shiftsSheet = workbook.getWorksheet(sheetNames.shifts);
  const { shiftColumns } = columnIndicies;
  const shifts = [];
  let day;
  shiftsSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      if (!isNullOrWhitespace(row.getCell(shiftColumns.date.index).value)) {
        day = tryLoadValue('date', row.getCell(shiftColumns.date.index), errors, allStaff, parsers.dateParser);
      }
      const startTime = tryLoadValue('startTime', row.getCell(shiftColumns.startTime.index), errors, allStaff, parsers.dateParser);
      const endTime = tryLoadValue('endTime', row.getCell(shiftColumns.endTime.index), errors, allStaff, parsers.dateParser);
      const start = addTime(day, startTime);
      const end = addTime(day, endTime);
      const types = tryLoadValue('shiftType', row.getCell(shiftColumns.shiftType.index), errors, allStaff, parsers.shiftTypeParser);
      let label;
      if (shiftColumns.label.index) {
        label = row.getCell(shiftColumns.label.index).value;
      }

      const excludedEmployees = tryLoadNullableValue(
        'excludedEmployees',
        shiftColumns.excludedNames,
        errors,
        allStaff,
        parsers.multipleNameParser,
        [],
        row,
      );

      const shift = new Shift({
        types, start, end, label, excludedEmployees,
      });

      const manualEmployee =
        tryLoadNullableValue('manualEmployee', shiftColumns.manualName, errors, allStaff, parsers.multipleNameParser, [], row);

      if (manualEmployee && manualEmployee.length === 1) {
        shift.allocateShift(new ShiftAllocation(shift, manualEmployee[0]));
      }
      shifts.push(shift);
    }
  });
  logger.info(`loadShifts time taken: ${moment().diff(metricStart)}`);
  return shifts;
};

const loadNegs = (workbook, allStaff, errors, columnIndicies) => {
  const metricStart = moment();
  const negsSheet = workbook.getWorksheet(sheetNames.negs);
  const { negsColumns } = columnIndicies;

  negsSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const name = tryLoadValue('name', row.getCell(negsColumns.name.index), errors, allStaff, parsers.nameParser);
      const day = tryLoadValue('date', row.getCell(negsColumns.date.index), errors, allStaff, parsers.dateParser);
      const startTime = tryLoadValue('startTime', row.getCell(negsColumns.startTime.index), errors, allStaff, parsers.dateParser);
      const endTime = tryLoadValue('endTime', row.getCell(negsColumns.endTime.index), errors, allStaff, parsers.dateParser);
      const reason = tryLoadNullableValue('reason', negsColumns.reason, errors, allStaff, parsers.stringParser, null, row);
      if (name && day && startTime && endTime) {
        const start = addTime(day, startTime);
        const end = addTime(day, endTime);
        allStaff[name].unavailabilities.push(new Unavailability({
          start, end, reason, type: unavailabilityTypes.neg,
        }));
      }
    }
  });
  logger.info(`loadNegs time taken: ${moment().diff(metricStart)}`);
};

const loadLeave = (workbook, allStaff, errors, columnIndicies) => {
  const metricStart = moment();
  const leaveSheet = workbook.getWorksheet(sheetNames.leave);
  const { leaveColumns } = columnIndicies;
  leaveSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const name = tryLoadValue('name', row.getCell(leaveColumns.name.index), errors, allStaff, parsers.nameParser);
      const firstDay = tryLoadValue('firstDay', row.getCell(leaveColumns.firstDay.index), errors, allStaff, parsers.dateParser);
      const reason = tryLoadNullableValue('reason', leaveColumns.reason, errors, allStaff, parsers.stringParser, null, row);
      if (firstDay && name) {
        const leave = new Unavailability({
          start: moment(firstDay).startOf('day').toDate(), reason, type: unavailabilityTypes.leave,
        });
        if (!isNullOrWhitespace(row.getCell(leaveColumns.lastDay.index).value)) {
          const lastDay = tryLoadValue('lastDay', row.getCell(leaveColumns.lastDay.index), errors, allStaff, parsers.dateParser);
          leave.end = moment(lastDay).endOf('day').toDate();
        } else {
          leave.end = moment(firstDay).endOf('day').toDate();
        }
        allStaff[name].unavailabilities.push(leave);
      }
    }
  });
  logger.info(`loadLeave time taken: ${moment().diff(metricStart)}`);
};

const doRun = (workbook) => {
  const metricStart = moment();
  const errors = [];
  const columnIndicies = loadColumnIndicies(workbook, errors);

  if (errors.length > 0) {
    logger.info(`Errors found in spreadsheet: ${errors.join('\n')}`);
    return { errors };
  }

  const allStaff = loadStaff(workbook, errors, columnIndicies);

  if (errors.length > 0) {
    logger.info(`Errors found in spreadsheet: ${errors.join('\n')}`);
    return { errors };
  }

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
