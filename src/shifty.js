const Excel = require('exceljs');
const Shift = require('./domain/shift');
const Employee = require('./domain/employee');
const Roster = require('./domain/roster');
const hewLevels = require('./domain/hew-level');

const hewLevelsByNumber = {
  3: hewLevels.hewLevel3,
  4: hewLevels.hewLevel4,
  5: hewLevels.hewLevel5,
  6: hewLevels.hewLevel6,
  7: hewLevels.hewLevel7,
  8: hewLevels.hewLevel8,
  9: hewLevels.hewLevel9,
};

const daysByColumn = { 4: 'Mon', 6: 'Tue', 8: 'Wed', 10: 'Thu', 12: 'Fri' };
const adjustTimezoneOffset = (date) => new Date(date.valueOf() + date.getTimezoneOffset() * 60000);

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
      for (let i = 4; i <= 12; i += 2) {
        if (row.getCell(i).value) {
          const startTime = adjustTimezoneOffset(row.getCell(i).value);
          const endTime = adjustTimezoneOffset(row.getCell(i + 1).value);
          hoursByDayOfWeek[daysByColumn[i]] = { startTime, endTime };
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
  shiftsSheet.eachRow((row, rowNumber) => {
    let day;
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

const run = () => {
  const workbook = new Excel.Workbook();
  return workbook.xlsx.readFile('./data/shifty.xlsx')
    .then(() => {
      const allStaff = loadStaff(workbook);
      loadNegs(workbook, allStaff);
      loadRdos(workbook, allStaff);
      const shifts = loadShifts(workbook, allStaff);
      return new Roster({ shifts, employees: allStaff });
    });
};

module.exports = { run };
