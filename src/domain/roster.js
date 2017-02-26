'use strict';

const shiftTypes = require('./shift-type');
const moment = require('moment');
const sameDay = require('../common').sameDay;

class Roster {
  constructor(params) {
    this.shifts = params.shifts;
    this.employees = params.employees;
    Object.keys(this.employees).forEach(key => this.employees[key].setAvailableForShifts(this.shifts));
    this.setShiftsByDays();
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
    Array.from(this.shifts).sort((firstShift, secondShift) => this.shiftScore(firstShift) - this.shiftScore(secondShift))
      .forEach(shift => shift.fill());
  }

  shiftScore(shift) {
    let value = 0;
    if (shift.type === shiftTypes.responsibleOfficer) {
      value -= 1000;
    } else if (shift.type === shiftTypes.aal) {
      value -= 100;
    }
    value += shift.availableEmployees.length;
    return value;
  }
}

module.exports = Roster;
