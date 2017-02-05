'use strict';

const employeeMinHours = 4;
const minHoursScoreChange = -40;

class Shift {
  constructor(params) {
    this.type = params.type;
    this.availableEmployees = [];
    this.allocatedEmployees = [];
    this.start = params.start;
    this.end = params.end;
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
    return this.availableEmployees[0];
  }

  // lower the better
  scoreEmployee(employee) {
    const employeeHours = employee.getCurrentHoursAllocated();
    const hoursWithShift = employeeHours + this.type.length;
    let score = 0;

    if (employeeHours < employeeMinHours) {
      score += minHoursScoreChange;
    }
    if (hoursWithShift < employee.idealMinHours) {
      score += hoursWithShift - employee.idealMinHours;
    } else if (hoursWithShift > employee.idealMaxHours) {
      score += hoursWithShift - employee.idealMaxHours;
    }

    return score;
  }
}

module.exports = Shift;
