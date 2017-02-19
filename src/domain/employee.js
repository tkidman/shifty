'use strict';
const days = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' };

class Employee {
  constructor(params) {
    this.name = params.name;
    this.hewLevel = params.hewLevel;
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
    this.availableForShifts = allShifts.filter(shift =>
    this._worksDuringShift(shift) && !this._negDuringShift(shift) && !this._rdoDuringShift(shift));
  }

  _minutes(date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  _overlap(neg, shift) {
    return (neg.start.getTime() >= shift.start.getTime() && neg.start.getTime() <= shift.end.getTime()) ||
      (neg.end.getTime() >= shift.start.getTime() && neg.end.getTime() <= shift.end.getTime()) ||
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

  getCurrentMinutesAllocated() {
    return this.allocatedShifts.reduce((minutes, allocatedShift) => minutes + allocatedShift.getShiftLengthMinutes(), 0);
  }
}

module.exports = Employee;
