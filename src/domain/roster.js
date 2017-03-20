'use strict';

const shiftTypes = require('./shift-type').shiftTypes;
const moment = require('moment');
const sameDay = require('../common').sameDay;

class Roster {
  constructor(params) {
    this.shifts = params.shifts;
    this.employees = params.employees;
    this.setShiftsByDays();
    Object.keys(this.employees).forEach(key => this.employees[key].setAvailableForShifts(this.shifts));
  }

  setShiftsByDays() {
    this.shiftsByDays = this.shifts.reduce((aggregator, shift) => {
      if (aggregator.length === 0 || !sameDay(aggregator[aggregator.length - 1].date, shift.start)) {
        aggregator.push({ date: shift.start, shifts: [], formattedDate: moment(shift.start).format('dddd, Do MMMM YYYY') });
      }
      aggregator[aggregator.length - 1].shifts.push(shift);
      return aggregator;
    }, []);
  }

  fillShifts() {
    this.sortShifts().forEach(shift => shift.fill());
  }

  sortShifts() {
    return (Array.from(this.shifts)).sort((firstShift, secondShift) =>
      this.shiftScore(firstShift) - this.shiftScore(secondShift));
  }

  shiftScore(shift) {
    let value = 0;
    if (shift.type === shiftTypes.responsibleOfficer) {
      value -= 10000;
    } else if (shift.type === shiftTypes.aal) {
      value -= 1000;
    } else if (shift.type === shiftTypes.standard) {
      value -= 100;
    }
    // backup gets filled last.
    value += shift.availableEmployees.length;
    return value;
  }
}

module.exports = Roster;
