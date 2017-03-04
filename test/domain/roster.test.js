'use strict';
const chai = require('chai');
const expect = chai.expect;
const Roster = require('../../src/domain/roster');
const Shift = require('../../src/domain/shift');
const shiftTypes = require('../../src/domain/shift-type');
const adjustTimezoneOffset = require('../../src/common').adjustTimezoneOffset;

describe('Shift', () => {
  let roster;

  beforeEach(() => {
    const shifts = [
      new Shift({
        type: shiftTypes.backup,
        start: adjustTimezoneOffset(new Date('2017-02-06T08:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-06T09:00:00')),
      }),
      new Shift({
        type: shiftTypes.standard,
        start: adjustTimezoneOffset(new Date('2017-02-06T09:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-06T10:00:00')),
      }),
      new Shift({
        type: shiftTypes.aal,
        start: adjustTimezoneOffset(new Date('2017-02-07T09:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-07T10:00:00')),
      }),
      new Shift({
        type: shiftTypes.responsibleOfficer,
        start: adjustTimezoneOffset(new Date('2017-02-07T10:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-07T11:00:00')),
      }),
    ];
    roster = new Roster({ shifts, employees: {} });
  });

  context('shiftsByDays', () => {
    it('organises shifts by days', () => {
      expect(roster.shiftsByDays.length).to.be.equal(2);
      expect(roster.shiftsByDays[0].shifts.length).to.be.equal(2);
      expect(roster.shiftsByDays[0].formattedDate).to.be.equal('Monday, 6th February 2017');
    });
  });

  context('sort', () => {
    it('sorts correctly based on type', () => {
      const sortedShifts = roster.sortShifts();
      expect(sortedShifts[0]).to.equal(roster.shifts[3]);
      expect(sortedShifts[1]).to.equal(roster.shifts[2]);
      expect(sortedShifts[2]).to.equal(roster.shifts[1]);
      expect(sortedShifts[3]).to.equal(roster.shifts[0]);
    });
  });
});