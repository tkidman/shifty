'use strict';

class Employee {

  constructor(params) {
    this.name = params.name;
    this.type = params.type; // opening, weekday, dayEnd, evening, weekend
    this.allocatedShifts = [];
    this.availableForShifts = [];
  }
}

module.exports = Employee;
