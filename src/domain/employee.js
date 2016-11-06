'use strict';

class Employee {

  constructor(params) {
    this.name = params.name;
    this.hewLevel = params.hewLevel;
    this.availableForShifts = [];
    this.allocatedShifts = [];
  }

  canWorkShift(shift) {
    return this.availableForShifts.includes(shift);
  }

  markAsAvailableForShift(shift) {
    this.availableForShifts.push(shift);
    shift.addAvailableEmployee(this);
  }

  allocateToShift(shift) {
    this.allocatedShifts.push(shift);
    this.availableForShifts.splice(this.availableForShifts.indexOf(shift), 1);
    shift.allocateEmployee(this);
  }
}

module.exports = Employee;
