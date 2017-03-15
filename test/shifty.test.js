'use strict';
const chai = require('chai');
const expect = chai.expect;
const shifty = require('../src/shifty');
const hewLevels = require('../src/domain/hew-level');
const adjustTimezoneOffset = require('../src/common').adjustTimezoneOffset;

describe('Shifty', () => {
  let roster;

  context('runs', () => {
    beforeEach(() =>
      shifty.run('./data/shifty.xlsx').then((runResult) => {
        roster = runResult.roster;
        return roster;
      }));

    it('parses data from a spreadsheet', () => {
      expect(roster.employees.Edwina.hewLevel).to.eql(hewLevels.hewLevel5);
      expect(roster.employees.Edwina.aal).to.eql(true);

      const firstShiftStart = adjustTimezoneOffset(new Date('2017-02-06T08:00:00'));
      const firstShiftEnd = adjustTimezoneOffset(new Date('2017-02-06T09:00:00'));
      expect(roster.shifts[0].shiftAllocation.employee.name).to.eql('Edwina');
      expect(roster.shifts[0].start).to.eql(firstShiftStart);
      expect(roster.shifts[0].end).to.eql(firstShiftEnd);

      expect(roster.employees.Edwina.hoursByDayOfWeek.Mon.start.getHours()).to.eql(8);
      expect(roster.employees.Edwina.hoursByDayOfWeek.Mon.start.getMinutes()).to.eql(0);
      expect(roster.employees.Edwina.hoursByDayOfWeek.Mon.end.getHours()).to.eql(17);
      expect(roster.employees.Edwina.hoursByDayOfWeek.Mon.end.getMinutes()).to.eql(0);

      expect(roster.employees.Rowena.hoursByDayOfWeek.Fri.start.getHours()).to.eql(8);
      expect(roster.employees.Rowena.hoursByDayOfWeek.Fri.start.getMinutes()).to.eql(30);
      expect(roster.employees.Rowena.hoursByDayOfWeek.Fri.end.getHours()).to.eql(17);
      expect(roster.employees.Rowena.hoursByDayOfWeek.Fri.end.getMinutes()).to.eql(0);

      const firstNegStart = adjustTimezoneOffset(new Date('2017-02-07T08:00:00'));
      const firstNegEnd = adjustTimezoneOffset(new Date('2017-02-07T09:00:00'));
      expect(roster.employees.Edwina.negs[0].start).to.eql(firstNegStart);
      expect(roster.employees.Edwina.negs[0].end).to.eql(firstNegEnd);

      const rdo = adjustTimezoneOffset(new Date('2017-02-07T00:00:00'));
      expect(roster.employees.Edwina.rdos[0]).to.eql(rdo);
    });
  });
});
