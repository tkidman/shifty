const Excel = require('exceljs');
const Shift = require('./domain/shift');
const Employee = require('./domain/employee');
const Roster = require('./domain/roster');
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

const daysByColumn = { 5: 'Mon', 7: 'Tue', 9: 'Wed', 11: 'Thu', 13: 'Fri' };

const addTime = (day, time) => {
  const dateTime = new Date(day);
  dateTime.setHours(time.getHours());
  dateTime.setMinutes(time.getMinutes());
  return dateTime;
};

const loadStaff = (workbook) => {
  const staffSheet = workbook.getWorksheet(2);
  const allStaff = {};
  staffSheet.eachRow((row, rowNumber) => {
    const hoursByDayOfWeek = {};
    const staffParams = {};
    if (rowNumber > 1) {
      staffParams.name = row.getCell(1).value;
      staffParams.hewLevel = hewLevelsByNumber[row.getCell(2).value];
      staffParams.aal = row.getCell(3).value === 'y';
      staffParams.averageWeeklyHours = row.getCell(4).value;
      for (let i = 5; i <= 13; i += 2) {
        if (row.getCell(i).value) {
          const start = adjustTimezoneOffset(row.getCell(i).value);
          const end = adjustTimezoneOffset(row.getCell(i + 1).value);
          hoursByDayOfWeek[daysByColumn[i]] = { start, end };
        }
      }
      staffParams.hoursByDayOfWeek = hoursByDayOfWeek;
      allStaff[staffParams.name] = new Employee(staffParams);
    }
  });
  return allStaff;
};

const loadShifts = (workbook, allStaff) => {
  const shiftsSheet = workbook.getWorksheet(1);
  const shifts = [];
  let day;
  shiftsSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      if (row.getCell(1).value) {
        day = adjustTimezoneOffset(row.getCell(1).value);
      }
      const startTime = adjustTimezoneOffset(row.getCell(2).value);
      const endTime = adjustTimezoneOffset(row.getCell(3).value);
      const start = addTime(day, startTime);
      const end = addTime(day, endTime);
      const type = row.getCell(4).value;
      const shift = new Shift({ type, start, end });
      const name = row.getCell(5).value;
      if (name) {
        allStaff[name].allocatedShifts.push(shift);
        shift.allocatedEmployees.push(allStaff[name]);
      }
      shifts.push(shift);
    }
  });
  return shifts;
};

const loadNegs = (workbook, allStaff) => {
  const negsSheet = workbook.getWorksheet(3);
  negsSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const name = row.getCell(1).value;
      const day = adjustTimezoneOffset(row.getCell(2).value);
      const startTime = adjustTimezoneOffset(row.getCell(3).value);
      const endTime = adjustTimezoneOffset(row.getCell(4).value);
      const start = addTime(day, startTime);
      const end = addTime(day, endTime);
      allStaff[name].negs.push({ start, end });
    }
  });
};

const loadRdos = (workbook, allStaff) => {
  const rdosSheet = workbook.getWorksheet(4);
  rdosSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const name = row.getCell(1).value;
      const day = adjustTimezoneOffset(row.getCell(2).value);
      allStaff[name].rdos.push(day);
    }
  });
};

const printRoster = (roster, sheet) => {
  sheet.addRow(['Start', 'End', 'Type', 'Name']);
  roster.shifts.forEach(shift => {
    const name = shift.allocatedEmployees[0] ? shift.allocatedEmployees[0].name : 'No one found :(';
    sheet.addRow([shift.start, shift.end, shift.type, name]);
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

const run = () => {
  const workbook = new Excel.Workbook();
  let roster;
  return workbook.xlsx.readFile('./data/shifty shifts.xlsx')
    .then(() => {
      const allStaff = loadStaff(workbook);
      loadNegs(workbook, allStaff);
      loadRdos(workbook, allStaff);
      const shifts = loadShifts(workbook, allStaff);
      roster = new Roster({ shifts, employees: allStaff });
      roster.fillShifts();
      const output = new Excel.Workbook();
      const sheet = output.addWorksheet('roster');
      printRoster(roster, sheet);
      printStaffSummary(roster, sheet);
      return output.csv.writeFile('./data/output.csv');
      // return output.xlsx.writeFile('./data/output.xlsx');
    })
    .then(() => roster);
};

module.exports = { run };
