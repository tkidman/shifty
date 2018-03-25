'use strict';
const chai = require('chai');
const expect = chai.expect;
const unavailabilityTypes = require('../../src/domain/unavailability').unavailabilityTypes;
const Unavailability = require('../../src/domain/unavailability').Unavailability;
const Employee = require('../../src/domain/employee');
const hewLevels = require('../../src/domain/hew-level');

describe('Unavailability', () => {
  context('employeeNegsDisplay', () => {
    let neg;
    let employee;
    beforeEach(() => {
      employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel4 });
      neg = new Unavailability({
        start: new Date('2017-02-06T17:00:00'),
        end: new Date('2017-02-06T19:00:00'),
        reason: 'nup, not happening',
        type: unavailabilityTypes.neg,
      });
    });
    it('creates the correct output', () => {
      expect(neg.display(employee)).to.equal('empy : 17:00 - 19:00 : nup, not happening');
      neg.reason = null;
      expect(neg.display(employee)).to.equal('empy : 17:00 - 19:00');
    });
  });

  context('employeeLeaveDisplay', () => {
    let leave;
    let employee;
    beforeEach(() => {
      employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel4 });
      leave = new Unavailability({
        start: new Date('2017-02-06T17:00:00'),
        reason: 'holiday',
        type: unavailabilityTypes.leave,
      });
    });

    it('creates the correct output', () => {
      expect(leave.display(employee)).to.equal('empy : 6/2/2017 : holiday');
      leave.end = new Date('2017-02-10T17:00:00');
      expect(leave.display(employee)).to.equal('empy : 6/2/2017 - 10/2/2017 : holiday');
      leave.reason = null;
      expect(leave.display(employee)).to.equal('empy : 6/2/2017 - 10/2/2017');
    });
  });
});
