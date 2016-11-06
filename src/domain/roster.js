'use strict';

class Roster {
  constructor(params) {
    this.shifts = params.shifts;
    this.employees = params.employees;
  }

  fillShifts() {
    this.shifts.forEach(shift => shift.fill());
  }
}

module.exports = Roster;
