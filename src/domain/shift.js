'use strict';

const dateString = require('../common').dateString;
const timeString = require('../common').timeString;
const logger = require('../common').logger;
const _ = require('lodash');
const shiftTypes = require('./shift-type').shiftTypes;

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
    this.allocatedEmployees = [];
    this.start = params.start;
    this.end = params.end;
  }

  getShiftLengthMinutes() {
    return (this.end.getHours() * 60 + this.end.getMinutes()) - (this.start.getHours() * 60 + this.start.getMinutes());
  }

  allocateEmployee(employee) {
    this.allocatedEmployees.push(employee);
    this.availableEmployees.splice(this.availableEmployees.indexOf(employee), 1);
  }

  addAvailableEmployee(employee) {
    this.availableEmployees.push(employee);
  }

  fill() {
    const employee = this.findBestEmployee();
    if (employee) {
      employee.allocateToShift(this);
    } else {
      logger.info(`unable to find employee for shift: ${this}`);
    }
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
    if (sortedScores[0]) {
      if (sortedScores[0].score > 1000) {
        logger.warn(
          `high score for best employee. shift: ${this}` +
          `, score: ${JSON.stringify(_.omit(sortedScores[0], 'employee'))}`
        );
      }
      return sortedScores[0].employee;
    }
    return null;
  }

  // lower the better
  scoreEmployee(employee) {
    const scoreResult = { score: 0, employee };
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
      scoreResult.nonResponsibleOfficer = true;
    }

    if (employee.workingAdjacentShift(this)) {
      scoreResult.score += workingAdjacentShiftScoreChange;
      scoreResult.workingAdjacentShift = true;
    }

    return scoreResult;
  }

  scoreAAL(employee, scoreResult) {
    if (this.type === shiftTypes.aal) {
      const aalShifts = employee.allocatedShifts.filter(shift => shift.type === shiftTypes.aal);
      scoreResult.score += workingAALShiftScoreChange * aalShifts.length;
      if (!employee.aal) {
        scoreResult.score += nonAALScoreChange;
        scoreResult.nonAAL = true;
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
