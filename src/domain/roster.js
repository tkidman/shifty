'use strict';

const shiftTypes = require('./shift-type').shiftTypes;
const shiftTypesList = require('./shift-type').shiftTypesList;
const moment = require('moment');
const common = require('../common');
const sameDay = common.sameDay;
const _ = require('lodash');

const skilledShifts = _.difference(shiftTypesList, [shiftTypes.backup, shiftTypes.standard]);

class Roster {
  constructor(params) {
    this.shifts = params.shifts;
    this.employees = params.employees;
    this.setShiftsByDays();
    Object.keys(this.employees).forEach(key => this.employees[key].setAvailableForShifts(this.shifts));
    Object.keys(this.employees).forEach(key => this.employees[key].setMinutesWorkedInRoster(this.shiftsByDays));
  }

  setShiftsByDays() {
    this.shiftsByDays = this.shifts.reduce((aggregator, shift) => {
      const weekDescription = shift.isShiftInPayweek() ? 'Pay Week' : 'Non Pay Week';
      if (aggregator.length === 0 || !sameDay(aggregator[aggregator.length - 1].date, shift.start)) {
        aggregator.push({
          date: shift.start,
          shifts: [],
          header: `${moment(shift.start).format('dddd, Do MMMM YYYY')} - ${weekDescription}`,
        });
      }
      aggregator[aggregator.length - 1].shifts.push(shift);
      return aggregator;
    }, []);
  }

  fillShifts() {
    this.sortShifts().forEach(shift => shift.fill());
  }

  sortShifts() {
    return (Array.from(this.shifts)).sort((firstShift, secondShift) =>
    this.shiftScore(firstShift) - this.shiftScore(secondShift));
  }

  shiftScore(shift) {
    let value = 0;
    if (shift.isNightShift()) {
      value -= 10000;
    }
    if (skilledShifts.includes(shift.type)) {
      value -= 1000;
    }
    if (shift.type === shiftTypes.standard) {
      value -= 100;
    }
    // backup gets filled last.
    value += shift.availableEmployees.length;
    return value;
  }
}

module.exports = Roster;
