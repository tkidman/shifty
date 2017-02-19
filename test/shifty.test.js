'use strict';
const chai = require('chai');
const expect = chai.expect;
const shifty = require('../src/shifty');
const hewLevels = require('../src/domain/hew-level');

const adjustTimezoneOffset = (date) => new Date(date.valueOf() + date.getTimezoneOffset() * 60000);

describe('Shifty', () => {
  let roster;

  beforeEach(() =>
    shifty.run().then((aRoster) => {
      roster = aRoster;
      return roster;
    }));

  context('runs', () => {
    it('parses data from a spreadsheet', () => {
      expect(roster.employees.Melanie.hewLevel).to.eql(hewLevels.hewLevel5);
      expect(roster.employees.Melanie.aal).to.eql(true);

      const firstShiftStart = adjustTimezoneOffset(new Date('2017-02-06T08:00:00'));
      const firstShiftEnd = adjustTimezoneOffset(new Date('2017-02-06T09:00:00'));
      expect(roster.shifts[0].allocatedEmployees[0].name).to.eql('Melanie');
      expect(roster.shifts[0].start).to.eql(firstShiftStart);
      expect(roster.shifts[0].end).to.eql(firstShiftEnd);

      expect(roster.employees.Melanie.hoursByDayOfWeek.Mon.startTime.getHours()).to.eql(8);
      expect(roster.employees.Melanie.hoursByDayOfWeek.Mon.startTime.getMinutes()).to.eql(30);
      expect(roster.employees.Melanie.hoursByDayOfWeek.Mon.endTime.getHours()).to.eql(17);
      expect(roster.employees.Melanie.hoursByDayOfWeek.Mon.endTime.getMinutes()).to.eql(0);

      expect(roster.employees.Vivian.hoursByDayOfWeek.Fri.startTime.getHours()).to.eql(8);
      expect(roster.employees.Vivian.hoursByDayOfWeek.Fri.startTime.getMinutes()).to.eql(30);
      expect(roster.employees.Vivian.hoursByDayOfWeek.Fri.endTime.getHours()).to.eql(17);
      expect(roster.employees.Vivian.hoursByDayOfWeek.Fri.endTime.getMinutes()).to.eql(0);

      const firstNegStart = adjustTimezoneOffset(new Date('2017-02-07T08:00:00'));
      const firstNegEnd = adjustTimezoneOffset(new Date('2017-02-07T09:00:00'));
      expect(roster.employees.Melanie.negs[0].start).to.eql(firstNegStart);
      expect(roster.employees.Melanie.negs[0].end).to.eql(firstNegEnd);

      const rdo = adjustTimezoneOffset(new Date('2017-02-07T00:00:00'));
      expect(roster.employees.Melanie.rdos[0]).to.eql(rdo);
    });
  });
});
