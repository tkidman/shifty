'use strict';

const dateString = require('../common').dateString;
const timeString = require('../common').timeString;
const logger = require('../common').logger;
const isInPayweek = require('../common').isInPayweek;
const _ = require('lodash');
const shiftTypes = require('./shift-type').shiftTypes;
const ShiftAllocation = require('./shift-allocation');
const warnings = require('./warnings');
const moment = require('moment');

const scoreConstants = {
  employeeMinMinutes: 4 * 60,
  minMinutesScoreChange: -1000,
  shouldNotPerformShiftTypeScoreChange: 1000000,
  workingAdjacentShiftScoreChange: 100000,
  workingAALShiftScoreChange: 1000,
};

class Shift {
  constructor(params) {
    this.type = params.type;
    this.availableEmployees = [];
    this.shiftAllocation = null;
    this.start = params.start;
    this.end = params.end;
    this.label = params.label;
  }

  getShiftLengthMinutes() {
    return (this.end.getHours() * 60 + this.end.getMinutes()) - (this.start.getHours() * 60 + this.start.getMinutes());
  }

  addAvailableEmployee(employee) {
    this.availableEmployees.push(employee);
  }

  fill() {
    const bestAllocation = this.findBestShiftAllocation();
    if (bestAllocation) {
      this.allocateShift(bestAllocation);
    } else {
      logger.info(`unable to find employee for shift: ${this}`);
    }
  }

  findBestShiftAllocation() {
    const potentialAllocations = this.getSortedPotentialShiftAllocations();
    let allocationDebugMessage = `Potential allocations for shift: ${this}`;
    potentialAllocations.forEach(potentialAllocation => {
      allocationDebugMessage += `\n\t ${JSON.stringify(_.omit(potentialAllocation, 'employee', 'shift'))}`;
    });
    logger.debug(allocationDebugMessage);
    const bestPotentialAllocation = potentialAllocations[0];
    if (bestPotentialAllocation) {
      if (Object.keys(bestPotentialAllocation.warningsList).length > 0) {
        logger.info(
          `warnings found for best allocation. shift: ${this}` +
          `, result: ${JSON.stringify(_.omit(bestPotentialAllocation, 'employee', 'shift'))}`
        );
      }
      return bestPotentialAllocation;
    }
    return null;
  }

  getSortedPotentialShiftAllocations() {
    const potentialAllocations = this.availableEmployees.map(employee => this.getPotentialShiftAllocation(employee))
      .sort((firstAllocation, secondAllocation) => firstAllocation.score - secondAllocation.score);
    return potentialAllocations;
  }

  allocateShift(bestAllocation) {
    this.shiftAllocation = bestAllocation;
    bestAllocation.employee.allocateToShift(bestAllocation);
    this.availableEmployees.splice(this.availableEmployees.indexOf(bestAllocation.employee), 1);
  }

  getPotentialShiftAllocation(employee) {
    const potentialAllocation = new ShiftAllocation(this, employee);
    const employeeMinutes = employee.getCurrentMinutesAllocated();
    const minutesWithShift = employeeMinutes + this.getShiftLengthMinutes();

    if (employeeMinutes < scoreConstants.employeeMinMinutes) {
      potentialAllocation.score += scoreConstants.minMinutesScoreChange;
    }

    if (minutesWithShift < employee.idealMinMinutes) {
      potentialAllocation.score += minutesWithShift - employee.idealMinMinutes;
    } else if (minutesWithShift > employee.idealMaxMinutes) {
      potentialAllocation.score += minutesWithShift - employee.idealMaxMinutes;
    }

    if (!employee.shiftTypes.includes(this.type)) {
      potentialAllocation.score += scoreConstants.shouldNotPerformShiftTypeScoreChange;
      potentialAllocation.warningsList.push(warnings.shouldNotPerformShiftType(employee, this));
    }

    if (this.type === shiftTypes.aal) {
      const aalShifts = employee.shiftAllocations.filter(shiftAllocation => shiftAllocation.shift.type === shiftTypes.aal);
      potentialAllocation.score += scoreConstants.workingAALShiftScoreChange * aalShifts.length;
    }

    if (employee.workingAdjacentShift(this)) {
      potentialAllocation.score += scoreConstants.workingAdjacentShiftScoreChange;
      potentialAllocation.warningsList.push(warnings.workingAdjacentShift(employee));
    }

    return potentialAllocation;
  }

  toString() {
    return `${dateString(this.start)}-${timeString(this.end)} ${this.type}`;
  }

  timeSpanString() {
    return `${timeString(this.start)}-${timeString(this.end)}`;
  }

  getTypeAndLabel() {
    if (this.label) {
      return `${this.type} - ${this.label}`;
    }
    return this.type;
  }

  isShiftInPayweek() {
    return isInPayweek(this.start);
  }

  isNightShift() {
    // a night shift ends after 6:30
    return moment(this.end).hours(18)
      .minutes(30)
      .isBefore(this.end);
  }

  isMorningShift() {
    // a morning shift begins before 9:00
    return moment(this.start).hours(8)
    // night shifts first.
      .minutes(59)
      .isAfter(this.start);
  }

  isDayBefore(shift) {
    return moment(this.start).add(1, 'days').isSame(shift.start, 'day');
  }

  isAdjacent(otherShift) {
    if (this.isNightShift() && otherShift.isMorningShift() && this.isDayBefore(otherShift)) {
      return true;
    }
    if (this.isMorningShift() && otherShift.isNightShift() && otherShift.isDayBefore(this)) {
      return true;
    }
    return otherShift.start.getTime() === this.end.getTime() ||
      otherShift.end.getTime() === this.start.getTime();
  }

  getShiftAllocationSummary(allEmployees) {
    // other people that could work the shift
    const worksDuringShiftEmployees = allEmployees.filter(
      employee => employee.worksDuringShift(this) && employee !== this.shiftAllocation.employee
    );
    const shiftAllocationSummary = {
      onLeaveEmployees: [],
      negEmployees: [],
      workingAtSameTimeEmployees: [],
      worsePotentialAllocations: [],
    };
    shiftAllocationSummary.names = (employees) => employees.map(employee => employee.name).join(', ');
    shiftAllocationSummary.onLeaveNames = () => shiftAllocationSummary.names(shiftAllocationSummary.onLeaveEmployees);
    shiftAllocationSummary.negNames = () => shiftAllocationSummary.names(shiftAllocationSummary.negEmployees);
    shiftAllocationSummary.workingNames = () => shiftAllocationSummary.names(shiftAllocationSummary.workingAtSameTimeEmployees);
    shiftAllocationSummary.worseAllocationDisplays = () =>
      shiftAllocationSummary.worsePotentialAllocations.map(
        allocation => `${allocation.employee.name} (${allocation.warningsList.join(', ')})`
      );
    shiftAllocationSummary.worseNames = () => shiftAllocationSummary.names(
      shiftAllocationSummary.worsePotentialAllocations.map(allocation => allocation.employee)
    );
    worksDuringShiftEmployees.reduce((summary, employee) => {
      if (employee.onLeaveDuringShift(this)) {
        summary.onLeaveEmployees.push(employee);
      } else if (employee.negDuringShift(this)) {
        summary.negEmployees.push(employee);
      } else if (employee.workingShiftAtSameTime(this)) {
        summary.workingAtSameTimeEmployees.push(employee);
      }
      return shiftAllocationSummary;
    }, shiftAllocationSummary);

    shiftAllocationSummary.worsePotentialAllocations = this.getSortedPotentialShiftAllocations().filter(
      shiftAllocation => shiftAllocation.employee !== this.shiftAllocation.employee
    );
    return shiftAllocationSummary;
  }
}

module.exports = { Shift, scoreConstants };
