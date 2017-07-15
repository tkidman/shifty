'use strict';
const shiftTypes = require('./shift-type').shiftTypes;
const days = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' };
const moment = require('moment');
const common = require('../common');
const isInPayweek = common.isInPayweek;
const formatNumber = common.formatNumber;

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
    this.breakTime = params.breakTime === undefined ? 60 : params.breakTime;
  }

  setMinutesWorkedInRoster(shiftsByDays) {
    this.minutesWorkedInRoster = this._calculateMinutesWorkedInRoster(shiftsByDays);
    this.idealMinMinutes = (this.hewLevel.minDeskPercentage / 100) * this.minutesWorkedInRoster;
    this.idealMaxMinutes = (this.hewLevel.maxDeskPercentage / 100) * this.minutesWorkedInRoster;
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
      } else if (!this.onLeaveDuringShift(shift)) {
        const lengthOfWorkingDayMinutes = moment(hoursForDay.end).diff(hoursForDay.start, 'minutes');
        minutes += (lengthOfWorkingDayMinutes - this._calculateBreakTime(lengthOfWorkingDayMinutes));
      }
      return minutes;
    }, 0);
  }

  _calculateBreakTime(lengthOfWorkingDayMinutes) {
    // apply break time if shift is over 5 hours long.
    if (lengthOfWorkingDayMinutes >= 300) {
      return this.breakTime;
    }
    return 0;
  }

  worksDuringShift(shift) {
    const hoursForDay = this._getHoursForDayOfShift(shift);
    if (hoursForDay) {
      return this._minutes(hoursForDay.start) <= this._minutes(shift.start) &&
        this._minutes(hoursForDay.end) >= this._minutes(shift.end);
    }
    return false;
  }

  _getHoursForDayOfShift(shift) {
    const day = days[shift.start.getDay()];
    let hoursForDay;
    if (isInPayweek(shift.start)) {
      hoursForDay = this.hoursByDayOfWeek.payweek[day];
    } else {
      hoursForDay = this.hoursByDayOfWeek.nonPayweek[day];
    }
    return hoursForDay;
  }

  negDuringShift(shift) {
    return this.negs.some(neg => this._overlap(neg, shift));
  }

  onLeaveDuringShift(shift) {
    return this.leave.some(leave => this._overlap(leave, shift));
  }

  workingShiftAtSameTime(shift) {
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
        sameTimeShift.workingShiftAtSameTimeEmployees.push(this);
        this.availableForShifts.splice(this.availableForShifts.indexOf(sameTimeShift), 1);
      });
  }

  getCurrentMinutesAllocated() {
    return this._getCurrentMinutesAllocatedExcludingType(null);
  }

  _getCurrentMinutesAllocatedExcludingType(excludedShiftType) {
    return this.shiftAllocations.reduce((minutes, shiftAllocation) => {
      if (!excludedShiftType || !shiftAllocation.shift.isOnlyShiftType(excludedShiftType)) {
        minutes += shiftAllocation.shift.getShiftLengthMinutes();
      }
      return minutes;
    }, 0);
  }

  getCurrentMinutesAllocatedExcludingBackup() {
    return this._getCurrentMinutesAllocatedExcludingType(shiftTypes.backup);
  }

  getAALShiftCount() {
    return this.shiftAllocations.filter(shiftAllocation => shiftAllocation.shift.isAALShift()).length;
  }

  workingAdjacentShift(shift) {
    return this.shiftAllocations.some(shiftAllocation => shiftAllocation.shift.isAdjacent(shift));
  }

  getTotalHoursWorked() {
    return formatNumber(this.minutesWorkedInRoster / 60);
  }

  getPercentageDeskHours() {
    if (this.minutesWorkedInRoster > 0) {
      return `${formatNumber((this.getCurrentMinutesAllocatedExcludingBackup() / this.minutesWorkedInRoster) * 100)} %`;
    }
    return 'N/A';
  }

  getStaffSummaryHoursAllocated() {
    return formatNumber(this.getCurrentMinutesAllocatedExcludingBackup() / 60);
  }

  getStaffSummaryIdealMinHours() {
    return formatNumber(this.idealMinMinutes / 60);
  }

  getStaffSummaryIdealMaxHours() {
    return formatNumber(this.idealMaxMinutes / 60);
  }
}

module.exports = Employee;
