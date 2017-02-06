'use strict';

class Employee {

  constructor(params) {
    this.name = params.name;
    this.hewLevel = params.hewLevel;
    this.aal = params.aal;
    this.averageWeeklyHours = params.averageWeeklyHours;
    this.availableForShifts = [];
    this.allocatedShifts = [];
    this.idealMinHours = (this.hewLevel.minDeskPercentage / 100) * this.averageWeeklyHours;
    this.idealMaxHours = (this.hewLevel.maxDeskPercentage / 100) * this.averageWeeklyHours;
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

  getCurrentHoursAllocated() {
    return this.allocatedShifts.reduce((hours, allocatedShift) => hours + allocatedShift.type.length, 0);
  }
}

module.exports = Employee;
