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
    const score = 0; // lowest is best
    this.availableEmployees.sort((first, second) => {

    });
    return this.availableEmployees.first();
  }

  calculateEmployeeShiftSuitablityScore(employee) {
    if (this.type != nig)
  }
}

module.exports = Shift;
