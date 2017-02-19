'use strict';

const employeeMinMinutes = 4 * 60;
const minMinutesScoreChange = -400;

class Shift {
  constructor(params) {
    this.type = params.type;
    this.availableEmployees = [];
    this.allocatedEmployees = [];
    this.start = params.start;
    this.end = params.end;
  }

  getShiftLengthMinutes() {
    return (this.end.getHours() * 60 + this.end.getMinutes()) - (this.start.getHours() * 60 + this.start.getMinutes());
  }

  allocateEmployee(employee) {
    this.allocatedEmployees.push(employee);
    this.availableEmployees.splice(this.availableEmployees.indexOf(employee), 1);
  }

  addAvailableEmployee(employee) {
    this.availableEmployees.push(employee);
  }

  fill() {
    const employee = this.findBestEmployee();
    employee.allocateToShift(this);
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
    const employeeMinutes = employee.getCurrentMinutesAllocated();
    const minutesWithShift = employeeMinutes + this.getShiftLengthMinutes();
    let score = 0;

    if (employeeMinutes < employeeMinMinutes) {
      score += minMinutesScoreChange;
    }
    if (minutesWithShift < employee.idealMinMinutes) {
      score += minutesWithShift - employee.idealMinMinutes;
    } else if (minutesWithShift > employee.idealMaxMinutes) {
      score += minutesWithShift - employee.idealMaxMinutes;
    }

    return score;
  }
}

module.exports = Shift;
