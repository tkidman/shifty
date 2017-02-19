'use strict';

class Roster {
  constructor(params) {
    this.shifts = params.shifts;
    this.employees = params.employees;
    Object.keys(this.employees).forEach(key => this.employees[key].setAvailableForShifts(this.shifts));
  }

  fillShifts() {
    this.shifts.forEach(shift => shift.fill());
  }
}

module.exports = Roster;
