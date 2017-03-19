'use strict';
const shiftTypes = require('./shift-type').shiftTypes;
const days = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' };
const adjustTimezoneOffset = require('../common').adjustTimezoneOffset;
const moment = require('moment');
const initialMondayPayweek = moment(adjustTimezoneOffset(new Date('2017-03-13T00:00:00')));

class Employee {
  constructor(params) {
    this.name = params.name;
    this.hewLevel = params.hewLevel;
    // boolean
    this.aal = params.aal;
    this.hoursByDayOfWeek = params.hoursByDayOfWeek;
    this.availableForShifts = [];
    this.shiftAllocations = [];
    this.negs = [];
    this.rdos = [];
    this.averageWeeklyHours = this.calculateAverageWeeklyHours(this.hoursByDayOfWeek);
    this.idealMinMinutes = (this.hewLevel.minDeskPercentage / 100) * this.averageWeeklyHours * 60;
    this.idealMaxMinutes = (this.hewLevel.maxDeskPercentage / 100) * this.averageWeeklyHours * 60;
  }

  calculateAverageWeeklyHours(hoursByDayOfWeek) {
    const totalMinutes = this.calculateMinutesWorkedPerWeek(hoursByDayOfWeek.payweek) +
      this.calculateMinutesWorkedPerWeek(hoursByDayOfWeek.nonPayweek);
    return totalMinutes / 2 / 60;
  }

  calculateMinutesWorkedPerWeek(hoursByWeek) {
    return Object.keys(hoursByWeek).reduce(
      (minutesAggreagtor, dayKey) => minutesAggreagtor + moment(hoursByWeek[dayKey].end).diff(hoursByWeek[dayKey].start, 'minutes'),
      0
    );
  }

  isInPayweek(date) {
    return initialMondayPayweek.diff(date, 'week') % 2 === 0;
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
    let hoursForDay;
    if (this.isInPayweek(shift.start)) {
      hoursForDay = this.hoursByDayOfWeek.payweek[day];
    } else {
      hoursForDay = this.hoursByDayOfWeek.nonPayweek[day];
    }
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
    return this.shiftAllocations.some(shiftAllocation => this._overlap(shiftAllocation.shift, shift));
  }

  canWorkShift(shift) {
    return this.availableForShifts.includes(shift);
  }

  markAsAvailableForShift(shift) {
    this.availableForShifts.push(shift);
    shift.addAvailableEmployee(this);
  }

  allocateToShift(shiftAllocation) {
    this.shiftAllocations.push(shiftAllocation);
    this.availableForShifts.splice(this.availableForShifts.indexOf(shiftAllocation.shift), 1);
    // remove other available shifts at the same time
    this.availableForShifts.filter(availableShift => this._overlap(shiftAllocation.shift, availableShift))
      .forEach(sameTimeShift => {
        sameTimeShift.availableEmployees.splice(sameTimeShift.availableEmployees.indexOf(this), 1);
        this.availableForShifts.splice(this.availableForShifts.indexOf(sameTimeShift), 1);
      });
  }

  getCurrentMinutesAllocated() {
    return this.getCurrentMinutesAllocatedExcludingTypes([]);
  }

  getCurrentMinutesAllocatedExcludingTypes(excludedShiftTypes) {
    return this.shiftAllocations.reduce((minutes, shiftAllocation) => {
      if (!excludedShiftTypes.includes(shiftAllocation.shift.type)) {
        minutes += shiftAllocation.shift.getShiftLengthMinutes();
      }
      return minutes;
    }, 0);
  }

  getCurrentMinutesAllocatedExcludingBackup() {
    return this.getCurrentMinutesAllocatedExcludingTypes([shiftTypes.backup]);
  }

  getAALShiftCount() {
    return this.shiftAllocations.filter(shiftAllocation => shiftAllocation.shift.type === shiftTypes.aal).length;
  }

  isResponsibleOfficer() {
    return this.hewLevel.responsibleOfficer;
  }

  workingAdjacentShift(shift) {
    return this.shiftAllocations.some(allocatedShift =>
      allocatedShift.shift.start.getTime() === shift.end.getTime() || allocatedShift.shift.end.getTime() === shift.start.getTime()
    );
  }
}

module.exports = Employee;
