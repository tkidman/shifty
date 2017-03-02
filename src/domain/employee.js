'use strict';
const days = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' };

class Employee {
  constructor(params) {
    this.name = params.name;
    this.hewLevel = params.hewLevel;
    // boolean
    this.aal = params.aal;
    this.averageWeeklyHours = params.averageWeeklyHours;
    this.hoursByDayOfWeek = params.hoursByDayOfWeek;
    this.availableForShifts = [];
    this.allocatedShifts = [];
    this.negs = [];
    this.rdos = [];
    this.idealMinMinutes = (this.hewLevel.minDeskPercentage / 100) * this.averageWeeklyHours * 60;
    this.idealMaxMinutes = (this.hewLevel.maxDeskPercentage / 100) * this.averageWeeklyHours * 60;
  }

  setAvailableForShifts(allShifts) {
    allShifts.filter(shift =>
      this._worksDuringShift(shift) && !this._negDuringShift(shift) && !this._rdoDuringShift(shift) && !this._workingShiftAtSameTime(shift)
    ).forEach(availableShift => this.markAsAvailableForShift(availableShift));
  }

  _minutes(date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  _overlap(neg, shift) {
    return (neg.start.getTime() > shift.start.getTime() && neg.start.getTime() < shift.end.getTime()) ||
      (neg.end.getTime() > shift.start.getTime() && neg.end.getTime() < shift.end.getTime()) ||
      (neg.start.getTime() <= shift.start.getTime() && neg.end.getTime() >= shift.end.getTime());
  }

  _worksDuringShift(shift) {
    const day = days[shift.start.getDay()];
    const hoursForDay = this.hoursByDayOfWeek[day];
    return hoursForDay &&
      this._minutes(hoursForDay.start) <= this._minutes(shift.start) &&
      this._minutes(hoursForDay.end) >= this._minutes(shift.end);
  }

  _negDuringShift(shift) {
    return this.negs.some(neg => this._overlap(neg, shift));
  }

  _rdoDuringShift(shift) {
    return this.rdos.some(rdo =>
      rdo.getFullYear() === shift.start.getFullYear() &&
      rdo.getMonth() === shift.start.getMonth() &&
      rdo.getDate() === shift.start.getDate()
    );
  }

  _workingShiftAtSameTime(shift) {
    return this.allocatedShifts.some(neg => this._overlap(neg, shift));
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
    // remove other available shifts at the same time
    this.availableForShifts.filter(availableShift => this._overlap(shift, availableShift))
      .forEach(sameTimeShift => {
        sameTimeShift.availableEmployees.splice(sameTimeShift.availableEmployees.indexOf(this), 1);
        this.availableForShifts.splice(this.availableForShifts.indexOf(sameTimeShift), 1);
      });
  }

  getCurrentMinutesAllocated() {
    return this.allocatedShifts.reduce((minutes, allocatedShift) => minutes + allocatedShift.getShiftLengthMinutes(), 0);
  }

  isResponsibleOfficer() {
    return this.hewLevel.responsibleOfficer;
  }

  workingAdjacentShift(shift) {
    return this.allocatedShifts.some(allocatedShift =>
      allocatedShift.start.getTime() === shift.end.getTime() || allocatedShift.end.getTime() === shift.start.getTime()
    );
  }
}

module.exports = Employee;
