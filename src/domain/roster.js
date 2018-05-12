'use strict';

const shiftTypes = require('./shift-type').shiftTypes;
const shiftTypesList = require('./shift-type').shiftTypesList;
const moment = require('moment');
const common = require('../common');
const sameDay = common.sameDay;
const logger = common.logger;
const _ = require('lodash');

const skilledShifts = _.difference(shiftTypesList, [shiftTypes.backup, shiftTypes.standard]);

class Roster {
  constructor(params) {
    const metricStart = moment();
    this.shifts = params.shifts;
    this.employees = params.employees;
    this.employeesList = Object.keys(this.employees).map(key => this.employees[key]);
    this.setShiftsByDays();
    this.shifts.forEach(shift => shift.initialise(this.employeesList));
    this.employeesList.forEach(employee => employee.setMinutesWorkedInRoster(this.shiftsByDays));
    logger.info(`construct roster time taken: ${moment().diff(metricStart)}`);
  }

  setShiftsByDays() {
    const metricStart = moment();
    this.shiftsByDays = this.shifts.reduce((aggregator, shift) => {
      const weekDescription = shift.isShiftInPayweek() ? 'Pay Week' : 'Non Pay Week';
      if (aggregator.length === 0 || !sameDay(aggregator[aggregator.length - 1].date, shift.start)) {
        aggregator.push({
          date: shift.start,
          shifts: [],
          header: `${moment(shift.start).format('dddd, Do MMMM YYYY')} - ${weekDescription}`,
        });
      }
      aggregator[aggregator.length - 1].shifts.push(shift);
      return aggregator;
    }, []);
    logger.info(`setShiftsByDays time taken: ${moment().diff(metricStart)}`);
  }

  fillShifts() {
    const metricStart = moment();
    this.sortShifts().forEach(shift => shift.fill());
    logger.info(`fillShifts time taken: ${moment().diff(metricStart)}`);
  }

  sortShifts() {
    return (Array.from(this.shifts)).sort((firstShift, secondShift) =>
    this.shiftScore(firstShift) - this.shiftScore(secondShift));
  }

  shiftScore(shift) {
    // sort by number available employees first.
    let value = -1000000 + (shift.availableEmployees.length * 10000);

    if (skilledShifts.some(shiftType => shift.types.includes(shiftType))) {
      value -= 100;
    }

    // backup gets filled last.
    if (shift.isOnlyShiftType(shiftTypes.backup)) {
      value += 10000000;
    }

    return value;
  }

  asICal() {
    let iCal = 'BEGIN:VCALENDAR\nVERSION:2.0\n';
    this.shifts.forEach(shift => {
      iCal += 'BEGIN:VEVENT\n';
      iCal += `DTSTART:${common.dateTimeDigitsUTC(shift.start)}\n`;
      iCal += `DTEND:${common.dateTimeDigitsUTC(shift.end)}\n`;
      iCal += `SUMMARY:${shift.summary()}\n`;
      iCal += 'END:VEVENT\n';
    });
    iCal += 'END:VCALENDAR';
    return iCal;
  }
}

module.exports = Roster;
