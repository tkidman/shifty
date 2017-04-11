'use strict';
const chai = require('chai');
const expect = chai.expect;
const shifty = require('../src/shifty');
const hewLevels = require('../src/domain/hew-level');
const adjustTimezoneOffset = require('../src/common').adjustTimezoneOffset;
const shiftTypes = require('../src/domain/shift-type').shiftTypes;
const shiftTypesList = require('../src/domain/shift-type').shiftTypesList;
const _ = require('lodash');

describe('Shifty', () => {
  let roster;

  context('runs', () => {
    beforeEach(() =>
      shifty.run('./data/shifty.xlsx').then((runResult) => {
        roster = runResult.roster;
        return roster;
      }));

    it('parses data from a spreadsheet', () => {
      const edwina = roster.employees.Edwina;
      const rowena = roster.employees.Rowena;
      expect(edwina.hewLevel).to.eql(hewLevels.hewLevel5);
      expect(_.difference(edwina.shiftTypes, shiftTypesList)).to.eql([]);
      expect(_.difference(rowena.shiftTypes, [shiftTypes.backup, shiftTypes.responsibleOfficer])).to.eql([]);
      expect(rowena.shiftTypes.includes(shiftTypes.aal)).to.eql(false);

      const firstShiftStart = adjustTimezoneOffset(new Date('2017-02-06T08:00:00'));
      const firstShiftEnd = adjustTimezoneOffset(new Date('2017-02-06T09:00:00'));
      expect(roster.shifts[0].shiftAllocation.name).to.eql('Edwina');
      expect(roster.shifts[0].start).to.eql(firstShiftStart);
      expect(roster.shifts[0].end).to.eql(firstShiftEnd);
      expect(roster.shifts[0].label).to.eql('Carlton Swap');
      expect(roster.shifts[1].label).to.be.null;
      expect(roster.shifts[2].shiftAllocation.name).to.be.equal('None Found');
      expect(roster.shiftsByDays[0].header).to.be.eql('Monday, 6th February 2017 - Pay Week');

      expect(edwina.hoursByDayOfWeek.payweek.Mon.start.getHours()).to.eql(8);
      expect(edwina.hoursByDayOfWeek.payweek.Mon.start.getMinutes()).to.eql(0);
      expect(edwina.hoursByDayOfWeek.payweek.Mon.end.getHours()).to.eql(17);
      expect(edwina.hoursByDayOfWeek.payweek.Mon.end.getMinutes()).to.eql(0);

      expect(edwina.hoursByDayOfWeek.payweek.Fri).to.be.undefined;

      expect(edwina.hoursByDayOfWeek.nonPayweek.Mon.start.getHours()).to.eql(8);
      expect(edwina.hoursByDayOfWeek.nonPayweek.Mon.start.getMinutes()).to.eql(0);
      expect(edwina.hoursByDayOfWeek.nonPayweek.Mon.end.getHours()).to.eql(17);
      expect(edwina.hoursByDayOfWeek.nonPayweek.Mon.end.getMinutes()).to.eql(0);

      expect(edwina.hoursByDayOfWeek.nonPayweek.Fri.start.getHours()).to.eql(8);
      expect(edwina.hoursByDayOfWeek.nonPayweek.Fri.start.getMinutes()).to.eql(0);
      expect(edwina.hoursByDayOfWeek.nonPayweek.Fri.end.getHours()).to.eql(16);
      expect(edwina.hoursByDayOfWeek.nonPayweek.Fri.end.getMinutes()).to.eql(30);

      expect(rowena.hoursByDayOfWeek.payweek.Fri.start.getHours()).to.eql(8);
      expect(rowena.hoursByDayOfWeek.payweek.Fri.start.getMinutes()).to.eql(30);
      expect(rowena.hoursByDayOfWeek.payweek.Fri.end.getHours()).to.eql(17);
      expect(rowena.hoursByDayOfWeek.payweek.Fri.end.getMinutes()).to.eql(0);

      const firstNegStart = adjustTimezoneOffset(new Date('2017-02-07T08:00:00'));
      const firstNegEnd = adjustTimezoneOffset(new Date('2017-02-07T09:00:00'));
      expect(edwina.negs[0].start).to.eql(firstNegStart);
      expect(edwina.negs[0].end).to.eql(firstNegEnd);

      const expectedEdwinaLeave = {
        start: adjustTimezoneOffset(new Date('2017-02-07T00:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-07T23:59:59.999')),
      };
      expect(edwina.leave[0]).to.eql(expectedEdwinaLeave);
      const expectedRowenaLeave = {
        start: adjustTimezoneOffset(new Date('2017-02-10T00:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-15T23:59:59.999')),
      };
      expect(rowena.leave[0]).to.eql(expectedRowenaLeave);
    });
  });
});
