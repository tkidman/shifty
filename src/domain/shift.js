'use strict';

class Shift {

  constructor(params) {
    this.time = params.time;
    this.type = params.type; // opening, weekday, dayEnd, evening, weekend
    this.assignedEmployees = [];
    this.availableEmployees = [];
  }
}

module.exports = Shift;
