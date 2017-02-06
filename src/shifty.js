const Excel = require('exceljs');
const Shift = require('./domain/shift');

const convertToGMT = (date) => new Date(date.valueOf() + date.getTimezoneOffset() * 60000);

const addTime = (day, time) => {
  const dateTime = new Date(day);
  dateTime.setHours(time.getHours());
  dateTime.setMinutes(time.getMinutes());
  return dateTime;
};

const run = () => {
  const workbook = new Excel.Workbook();
  return workbook.xlsx.readFile('./data/shifty.xlsx')
    .then(() => {
      const staffSheet = workbook.getWorksheet(2);
      const allStaff = {};
      staffSheet.eachRow((row, rowNumber) => {
        const staffParams = {};
        if (rowNumber > 1) {
          staffParams.name = row.getCell(1).value;
          staffParams.hewLevel = row.getCell(2).value;
          staffParams.aal = row.getCell(3).value;
        }
      });

      const shiftsSheet = workbook.getWorksheet(1);
      const shifts = [];
      shiftsSheet.eachRow((row, rowNumber) => {
        let day;
        if (rowNumber > 1) {
          if (row.getCell(1).value) {
            day = convertToGMT(row.getCell(1).value);
          }
          const startTime = convertToGMT(row.getCell(2).value);
          const endTime = row.getCell(3).value;
          const start = addTime(day, startTime);
          const end = addTime(day, endTime);
          const type = row.getCell(4).value;
          shifts.push(new Shift({ type, start, end }));
        }
      });
      console.log(workbook);
    });
};

module.exports = { run };
