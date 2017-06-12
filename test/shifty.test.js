'use strict';
const chai = require('chai');
const expect = chai.expect;
const shifty = require('../src/shifty');
const hewLevels = require('../src/domain/hew-level');
const adjustTimezoneOffset = require('../src/common').adjustTimezoneOffset;
const shiftTypes = require('../src/domain/shift-type').shiftTypes;
const shiftTypesList = require('../src/domain/shift-type').shiftTypesList;

describe('Shifty', () => {
  let roster;
  let errors;

  const runTests = () => {
    const edwina = roster.employees.Edwina;
    const rowena = roster.employees.Rowena;
    expect(edwina.hewLevel).to.eql(hewLevels.hewLevel5);
    expect(edwina.shiftTypes.sort()).to.eql(shiftTypesList.sort());
    expect(rowena.shiftTypes.sort()).to.eql([shiftTypes.backup, shiftTypes.responsibleOfficer]);

    const firstShiftStart = adjustTimezoneOffset(new Date('2017-02-06T08:00:00'));
    const firstShiftEnd = adjustTimezoneOffset(new Date('2017-02-06T09:00:00'));
    expect(roster.shifts[0].shiftAllocation.name).to.eql('Edwina');
    expect(roster.shifts[0].start).to.eql(firstShiftStart);
    expect(roster.shifts[0].end).to.eql(firstShiftEnd);
    expect(roster.shifts[0].label).to.eql('Carlton Swap');
    expect(roster.shifts[1].label).to.be.null;
    expect(roster.shifts[2].shiftAllocation.name).to.be.equal('None Found');
    expect(edwina.breakTime).to.equal(0);
    expect(rowena.breakTime).to.equal(60);
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
  };

  const loadRoster = (legacy, path) =>
    shifty.run(path, legacy).then((runResult) => {
      roster = runResult.roster;
      errors = runResult.errors;
    });

  context('runs legacy', () => {
    beforeEach(() => loadRoster(true, './data/shifty_legacy.xlsx'));
    it('parses data from a legacy spreadsheet', () => {
      runTests();
    });
  });

  context('runs normal', () => {
    beforeEach(() => loadRoster(false, './data/shifty.xlsx'));
    it('parses data from a spreadsheet', () => {
      runTests();
    });
  });

  context('runs broken', () => {
    beforeEach(() => loadRoster(false, './data/shifty_broken.xlsx'));
    it('generates errors when columns are invalid', () => {
      expect(errors).to.eql([
        'Unexpected column named \'Wrong\' found in sheet \'Staff\'',
        'Mandatory column \'name\' not found in sheet \'Staff\'',
        'Mandatory column \'hew\' not found in sheet \'Staff\'',
        'Mandatory column \'name\' not found in sheet \'Negs\'',
        'Unexpected column named \'Names\' found in sheet \'Leave\'',
        'Mandatory column \'name\' not found in sheet \'Leave\'',
      ]);
    });
  });
});
