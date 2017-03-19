const Excel = require('exceljs');
const Shift = require('./domain/shift');
const Employee = require('./domain/employee');
const Roster = require('./domain/roster');
const parsers = require('./cell-parsers');
const logger = require('./common').logger;

const staffColumns = {
  name: 1,
  hewLevel: 2,
  aal: 3,
  startMondayPayweek: 4,
  startMondayNonPayweek: 14,
  endFridayNonPayweek: 23,
};
const shiftColumns = { day: 1, start: 2, end: 3, type: 4, manualName: 5 };
const negsColumns = { name: 1, day: 2, start: 3, end: 4 };
const rdosColumns = { name: 1, day: 2 };
const worksheets = { shifts: 1, staff: 2, negs: 3, rdos: 4 };

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

const loadStaffHoursByDayOfWeek = (row, errors, allStaff) => {
  const hoursByDayOfWeek = { payweek: {}, nonPayweek: {} };
  for (let i = staffColumns.startMondayPayweek; i <= staffColumns.endFridayNonPayweek; i += 2) {
    if (row.getCell(i).value) {
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
  const staffSheet = workbook.getWorksheet(worksheets.staff);
  const allStaff = {};
  staffSheet.eachRow((row, rowNumber) => {
    const staffParams = {};
    if (rowNumber > 1) {
      staffParams.name = row.getCell(staffColumns.name).value;

      tryLoadParamValue(
        staffParams, 'hewLevel', row.getCell(staffColumns.hewLevel), errors, allStaff, parsers.hewLevelParser
      );
      tryLoadParamValue(
        staffParams, 'aal', row.getCell(staffColumns.aal), errors, allStaff, parsers.trueFalseParser
      );
      staffParams.hoursByDayOfWeek = loadStaffHoursByDayOfWeek(row, errors, allStaff);
      allStaff[staffParams.name] = new Employee(staffParams);
    }
  });
  return allStaff;
};

const loadShifts = (workbook, allStaff, errors) => {
  const shiftsSheet = workbook.getWorksheet(worksheets.shifts);
  const shifts = [];
  let day;
  shiftsSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      if (row.getCell(shiftColumns.day).value) {
        day = tryLoadValue('day', row.getCell(shiftColumns.day), errors, allStaff, parsers.dateParser);
      }
      const startTime = tryLoadValue('startTime', row.getCell(shiftColumns.start), errors, allStaff, parsers.dateParser);
      const endTime = tryLoadValue('endTime', row.getCell(shiftColumns.end), errors, allStaff, parsers.dateParser);
      const start = addTime(day, startTime);
      const end = addTime(day, endTime);
      const type = tryLoadValue('shiftType', row.getCell(shiftColumns.type), errors, allStaff, parsers.shiftTypeParser);
      const shift = new Shift({ type, start, end });
      const manualNameCell = row.getCell(shiftColumns.manualName);
      if (manualNameCell.value) {
        const name = tryLoadValue('manualName', manualNameCell, errors, allStaff, parsers.nameParser);
        if (name) {
          shift.allocateShift(allStaff[name]);
        }
      }
      shifts.push(shift);
    }
  });
  return shifts;
};

const loadNegs = (workbook, allStaff, errors) => {
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
};

const loadRdos = (workbook, allStaff, errors) => {
  const rdosSheet = workbook.getWorksheet(worksheets.rdos);
  rdosSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const name = tryLoadValue('name', row.getCell(rdosColumns.name), errors, allStaff, parsers.nameParser);
      const day = tryLoadValue('day', row.getCell(rdosColumns.day), errors, allStaff, parsers.dateParser);
      allStaff[name].rdos.push(day);
    }
  });
};

const printRoster = (roster, sheet) => {
  sheet.addRow(['Shift', 'Name']);
  let day = roster.shifts[0].start.day;
  roster.shifts.forEach(shift => {
    const name = shift.shiftAllocation ? shift.shiftAllocation.employee.name : 'No one found :(';
    sheet.addRow([shift.toString(), name]);
    if (shift.start.date !== day) {
      sheet.addRow([]);
      day = shift.start.date;
    }
  });
};

const printStaffSummary = (roster, sheet) => {
  sheet.addRow(['Name', 'Desk Hours', 'Ideal min hours', 'Ideal max hours']);
  Object.keys(roster.employees).forEach(key => {
    const employee = roster.employees[key];
    sheet.addRow([
      employee.name,
      employee.getCurrentMinutesAllocated() / 60,
      employee.idealMinMinutes / 60,
      employee.idealMaxMinutes / 60,
    ]);
  });
};

const doRun = (workbook) => {
  const errors = [];
  const allStaff = loadStaff(workbook, errors);
  loadNegs(workbook, allStaff, errors);
  loadRdos(workbook, allStaff, errors);
  const shifts = loadShifts(workbook, allStaff, errors);
  if (errors.length > 0) {
    logger.info(`Errors found in spreadsheet: ${errors.join('\n')}`);
    return { errors };
  }
  const roster = new Roster({ shifts, employees: allStaff });
  roster.fillShifts();
  const output = new Excel.Workbook();
  const sheet = output.addWorksheet('roster');
  printRoster(roster, sheet);
  printStaffSummary(roster, sheet);
  return { output, roster };
};

const run = (fullFilename) => {
  const workbook = new Excel.Workbook();
  return workbook.xlsx.readFile(fullFilename)
    .then(() => doRun(workbook));
};

module.exports = { run, parsers };
