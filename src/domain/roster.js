'use strict';

const shiftTypes = require('./shift-type');

class Roster {
  constructor(params) {
    this.shifts = params.shifts;
    this.employees = params.employees;
    Object.keys(this.employees).forEach(key => this.employees[key].setAvailableForShifts(this.shifts));
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
