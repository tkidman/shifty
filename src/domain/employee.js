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
    this.shiftTypes = params.shiftTypes || [];
    if (this.hewLevel.responsibleOfficer) {
      this.shiftTypes.push(shiftTypes.responsibleOfficer);
    }
    this.hoursByDayOfWeek = params.hoursByDayOfWeek;
    this.availableForShifts = [];
    this.shiftAllocations = [];
    this.negs = [];
    this.leave = [];
  }

  setAvailableForShifts(allShifts) {
    allShifts.filter(shift =>
      this._worksDuringShift(shift) && !this._negDuringShift(shift) && !this._onLeaveDuringShift(shift) && !this._workingShiftAtSameTime(shift)
    ).forEach(availableShift => this.markAsAvailableForShift(availableShift));
  }

  setMinutesWorkedInRoster(shiftsByDays) {
    this.minutesWorkedInRoster = this._calculateMinutesWorkedInRoster(shiftsByDays);
    this.idealMinMinutes = (this.hewLevel.minDeskPercentage / 100) * this.minutesWorkedInRoster;
    this.idealMaxMinutes = (this.hewLevel.maxDeskPercentage / 100) * this.minutesWorkedInRoster;
  }

  _isInPayweek(date) {
    return initialMondayPayweek.diff(date, 'week') % 2 === 0;
  }

  _minutes(date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  _overlap(neg, shift) {
    return (neg.start.getTime() > shift.start.getTime() && neg.start.getTime() < shift.end.getTime()) ||
      (neg.end.getTime() > shift.start.getTime() && neg.end.getTime() < shift.end.getTime()) ||
      (neg.start.getTime() <= shift.start.getTime() && neg.end.getTime() >= shift.end.getTime());
  }

  _calculateMinutesWorkedInRoster(shiftsByDays) {
    return shiftsByDays.reduce((minutes, shiftsByDay) => {
      // any shift on the day is fine to use
      const shift = shiftsByDay.shifts[0];
      const hoursForDay = this._getHoursForDayOfShift(shift);
      if (!hoursForDay) {
        // check manual shift assignments
        minutes += this.shiftAllocations
          .filter(shiftAllocation => moment(shiftAllocation.shift.start).isSame(shift.start, 'day'))
          .reduce(
            (allocatedMinutes, shiftAllocation) => moment(shiftAllocation.shift.end).diff(shiftAllocation.shift.start, 'minutes'), 0
          );
      } else if (!this._onLeaveDuringShift(shift)) {
        minutes += moment(hoursForDay.end).diff(hoursForDay.start, 'minutes');
      }
      return minutes;
    }, 0);
  }

  _worksDuringShift(shift) {
    const hoursForDay = this._getHoursForDayOfShift(shift);
    return hoursForDay &&
      this._minutes(hoursForDay.start) <= this._minutes(shift.start) &&
      this._minutes(hoursForDay.end) >= this._minutes(shift.end);
  }

  _getHoursForDayOfShift(shift) {
    const day = days[shift.start.getDay()];
    let hoursForDay;
    if (this._isInPayweek(shift.start)) {
      hoursForDay = this.hoursByDayOfWeek.payweek[day];
    } else {
      hoursForDay = this.hoursByDayOfWeek.nonPayweek[day];
    }
    return hoursForDay;
  }

  _negDuringShift(shift) {
    return this.negs.some(neg => this._overlap(neg, shift));
  }

  _onLeaveDuringShift(shift) {
    return this.leave.some(leave => this._overlap(leave, shift));
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

  getTotalHoursWorked() {
    return this.minutesWorkedInRoster / 60;
  }

  getPercentageDeskHours() {
    const precentageDeskHours = (this.getCurrentMinutesAllocatedExcludingBackup() / this.minutesWorkedInRoster) * 100;
    return `${precentageDeskHours.toPrecision(3)} %`;
  }
}

module.exports = Employee;
