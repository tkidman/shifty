'use strict';

const dateString = require('../common').dateString;
const timeString = require('../common').timeString;
const logger = require('../common').logger;
const _ = require('lodash');
const shiftTypes = require('./shift-type').shiftTypes;
const ShiftAllocation = require('./shift-allocation');

const employeeMinMinutes = 4 * 60;
const minMinutesScoreChange = -1000;
const nonAALScoreChange = 10000;
const nonResponsibleOfficerScoreChange = 10000;
const workingAdjacentShiftScoreChange = 10000;
const workingAALShiftScoreChange = 2000;

class Shift {
  constructor(params) {
    this.type = params.type;
    this.availableEmployees = [];
    this.shiftAllocation = null;
    this.start = params.start;
    this.end = params.end;
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
      this.allocateShift(scoreResult.employee, scoreResult.warnings);
    } else {
      logger.info(`unable to find employee for shift: ${this}`);
    }
  }

  allocateShift(employee, warnings) {
    this.shiftAllocation = new ShiftAllocation(this, employee, warnings);
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
      if (Object.keys(bestScoreResult.warnings).length > 0) {
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
    const scoreResult = { score: 0, employee, warnings: {} };
    scoreResult.name = employee.name;
    const employeeMinutes = employee.getCurrentMinutesAllocated();
    const minutesWithShift = employeeMinutes + this.getShiftLengthMinutes();

    if (employeeMinutes < employeeMinMinutes) {
      scoreResult.score += minMinutesScoreChange;
    }

    if (minutesWithShift < employee.idealMinMinutes) {
      scoreResult.score += minutesWithShift - employee.idealMinMinutes;
    } else if (minutesWithShift > employee.idealMaxMinutes) {
      scoreResult.score += minutesWithShift - employee.idealMaxMinutes;
    }

    this.scoreAAL(employee, scoreResult);

    if (this.type === shiftTypes.responsibleOfficer && !employee.isResponsibleOfficer()) {
      scoreResult.score += nonResponsibleOfficerScoreChange;
      scoreResult.warnings.nonResponsibleOfficer = true;
    }

    if (employee.workingAdjacentShift(this)) {
      scoreResult.score += workingAdjacentShiftScoreChange;
      scoreResult.warnings.workingAdjacentShift = true;
    }

    return scoreResult;
  }

  scoreAAL(employee, scoreResult) {
    if (this.type === shiftTypes.aal) {
      const aalShifts = employee.shiftAllocations.filter(shiftAllocation => shiftAllocation.shift.type === shiftTypes.aal);
      scoreResult.score += workingAALShiftScoreChange * aalShifts.length;
      if (!employee.aal) {
        scoreResult.score += nonAALScoreChange;
        scoreResult.warnings.nonAAL = true;
      }
    }
  }

  toString() {
    return `${dateString(this.start)}-${timeString(this.end)} ${this.type}`;
  }

  timeSpanString() {
    return `${timeString(this.start)}-${timeString(this.end)}`;
  }
}

module.exports = Shift;
