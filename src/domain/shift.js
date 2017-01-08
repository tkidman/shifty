'use strict';

const shiftTypes = require('./shiftType');

class Shift {
  constructor(params) {
    this.type = params.type;
    this.availableEmployees = [];
    this.allocatedEmployees = [];
  }

  allocateEmployee(employee) {
    this.allocatedEmployees.push(employee);
    this.availableEmployees.splice(this.availableEmployees.indexOf(employee), 1);
  }

  addAvailableEmployee(employee) {
    this.availableEmployees.push(employee);
  }

  fill() {
    while (this.allocatedEmployees.length < this.type.numEmployees) {
      const employee = this.findBestEmployee();
      employee.allocateToShift(this);
    }
  }

  findBestEmployee() {
    // give each available employee a score to sort on
    this.availableEmployees.sort((first, second) =>
      this.scoreEmployee(first) - this.scoreEmployee(second)
    );
    return this.availableEmployees.first();
  }

  scoreEmployee(employee) {
    // if (this.type != nig)
    return 5;
  }
}

module.exports = Shift;
