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
    const scoreResult = this.findBestEmployee();
    if (scoreResult) {
      this.allocateShift(scoreResult.employee, scoreResult.warningsList);
    } else {
      logger.info(`unable to find employee for shift: ${this}`);
    }
  }

  allocateShift(employee, warningsList) {
    this.shiftAllocation = new ShiftAllocation(this, employee, warningsList);
    employee.allocateToShift(this.shiftAllocation);
    this.availableEmployees.splice(this.availableEmployees.indexOf(employee), 1);
  }

  findBestEmployee() {
    // give each available employee a score to sort on
    const sortedScores = this.availableEmployees.map(employee => this.scoreEmployee(employee))
      .sort((firstScore, secondScore) => firstScore.score - secondScore.score);
    let scoreDebugMessage = `scores for shift: ${this}`;
    sortedScores.forEach(score => {
      scoreDebugMessage += `\n\t ${JSON.stringify(_.omit(score, 'employee'))}`;
    });
    logger.debug(scoreDebugMessage);
    const bestScoreResult = sortedScores[0];
    if (bestScoreResult) {
      if (Object.keys(bestScoreResult.warningsList).length > 0) {
        logger.warn(
          `warnings found for best employee. shift: ${this}` +
          `, result: ${JSON.stringify(_.omit(bestScoreResult, 'employee'))}`
        );
      }
      return bestScoreResult;
    }
    return null;
  }

  // lower the better
  scoreEmployee(employee) {
    const scoreResult = { score: 0, employee, warningsList: [] };
    scoreResult.name = employee.name;
    const employeeMinutes = employee.getCurrentMinutesAllocated();
    const minutesWithShift = employeeMinutes + this.getShiftLengthMinutes();

    if (employeeMinutes < scoreConstants.employeeMinMinutes) {
      scoreResult.score += scoreConstants.minMinutesScoreChange;
    }

    if (minutesWithShift < employee.idealMinMinutes) {
      scoreResult.score += minutesWithShift - employee.idealMinMinutes;
    } else if (minutesWithShift > employee.idealMaxMinutes) {
      scoreResult.score += minutesWithShift - employee.idealMaxMinutes;
    }

    if (!employee.shiftTypes.includes(this.type)) {
      scoreResult.score += scoreConstants.shouldNotPerformShiftTypeScoreChange;
      scoreResult.warningsList.push(warnings.shouldNotPerformShiftType(employee, this));
    }

    if (this.type === shiftTypes.aal) {
      const aalShifts = employee.shiftAllocations.filter(shiftAllocation => shiftAllocation.shift.type === shiftTypes.aal);
      scoreResult.score += scoreConstants.workingAALShiftScoreChange * aalShifts.length;
    }

    if (employee.workingAdjacentShift(this)) {
      scoreResult.score += scoreConstants.workingAdjacentShiftScoreChange;
      scoreResult.warningsList.push(warnings.workingAdjacentShift(employee));
    }

    return scoreResult;
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
}

module.exports = { Shift, scoreConstants };
