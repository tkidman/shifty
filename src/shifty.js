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
      const shiftsSheet = workbook.getWorksheet(1);
      shiftsSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const day = convertToGMT(row.getCell(1).value);
          const startTime = convertToGMT(row.getCell(2).value);
          const endTime = row.getCell(3).value;

          const start = addTime(day, startTime);
          const end = addTime(day, endTime);
          const type = row.getCell(4).value;
          const shiftType = row.getCell(5).value;
          const numberOfStaff = row.getCell(6).value;
          const shift = new Shift({ type, start, end });
        }
      });
      console.log(workbook);
    });
};

module.exports = { run };
