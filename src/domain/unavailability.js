'use strict';

const { timeString, dateOnlyString } = require('../common');

const unavailabilityTypes = {
  neg: 'neg',
  leave: 'leave',
};

class Unavailability {
  constructor(params) {
    this.type = params.type;
    this.start = params.start;
    this.end = params.end;
    this.reason = params.reason;
  }

  display(employee) {
    const displayStart = `${employee.name} : `;
    if (this.type === unavailabilityTypes.neg) {
      return `${displayStart}${this._negDisplay()}`;
    }
    return `${displayStart}${this._leaveDisplay()}`;
  }

  _negDisplay() {
    let display = `${timeString(this.start)} - ${timeString(this.end)}`;
    if (this.reason) {
      display += ` : ${this.reason}`;
    }
    return display;
  }

  _leaveDisplay() {
    let display = `${dateOnlyString(this.start)}`;
    if (this.end) {
      display += ` - ${dateOnlyString(this.end)}`;
    }
    if (this.reason) {
      display += ` : ${this.reason}`;
    }

    return display;
  }
}

module.exports = { Unavailability, unavailabilityTypes };
