'use strict';

const { shiftTypes } = require('./shift-type');
const { unavailabilityTypes } = require('./unavailability');
const moment = require('moment');
const common = require('../common');

const days = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri',
};
const { isInPayweek, formatNumber } = common;

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
    this.unavailabilities = [];
    this.breakTime = params.breakTime === undefined ? 60 : params.breakTime;
  }

  setMinutesWorkedInRoster(shiftsByDays) {
    this.minutesWorkedInRoster = this._calculateMinutesWorkedInRoster(shiftsByDays);
    this.idealMinMinutes = (this.hewLevel.minDeskPercentage / 100) * this.minutesWorkedInRoster;
    this.idealMaxMinutes = (this.hewLevel.maxDeskPercentage / 100) * this.minutesWorkedInRoster;
  }

  static _minutes(date) {
    return (date.getHours() * 60) + date.getMinutes();
  }

  static _overlap(neg, shift) {
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
            (allocatedMinutes, shiftAllocation) => moment(shiftAllocation.shift.end).diff(shiftAllocation.shift.start, 'minutes'),
            0,
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
      return Employee._minutes(hoursForDay.start) <= Employee._minutes(shift.start) &&
        Employee._minutes(hoursForDay.end) >= Employee._minutes(shift.end);
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

  findUnavailabilityDuringShift(shift) {
    return this.unavailabilities.find(unavailability => Employee._overlap(unavailability, shift));
  }

  onLeaveDuringShift(shift) {
    const unavailability = this.findUnavailabilityDuringShift(shift);
    return unavailability && unavailability.type === unavailabilityTypes.leave;
  }

  workingShiftAtSameTime(shift) {
    return this.shiftAllocations.some(shiftAllocation => Employee._overlap(shiftAllocation.shift, shift));
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
    this.availableForShifts.filter(availableShift => Employee._overlap(shiftAllocation.shift, availableShift))
      .forEach((sameTimeShift) => {
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
