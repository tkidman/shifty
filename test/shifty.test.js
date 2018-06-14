'use strict';

const chai = require('chai');
const shifty = require('../src/shifty');
const hewLevels = require('../src/domain/hew-level');
const { shiftTypes, shiftTypesList } = require('../src/domain/shift-type');
const { unavailabilityTypes, Unavailability } = require('../src/domain/unavailability');

const { expect } = chai;

const sortByName = (a, b) => {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
};

describe('Shifty', () => {
  let runResult;

  const runTests = () => {
    const { roster } = runResult;
    const edwina = roster.employees.Edwina;
    const rowena = roster.employees.Rowena;
    expect(edwina.hewLevel).to.eql(hewLevels.hewLevel5);
    expect(edwina.shiftTypes.sort(sortByName)).to.eql(shiftTypesList.sort(sortByName));
    expect(rowena.shiftTypes.sort(sortByName)).to.eql([shiftTypes.backup, shiftTypes.responsibleOfficer]);

    const firstShiftStart = new Date('2017-02-06T08:00:00');
    const firstShiftEnd = new Date('2017-02-06T09:00:00');
    expect(roster.shifts[0].shiftAllocation.name).to.eql('Edwina');
    expect(roster.shifts[0].start).to.eql(firstShiftStart);
    expect(roster.shifts[0].end).to.eql(firstShiftEnd);
    expect(roster.shifts[0].label).to.eql('Carlton Swap');
    expect(roster.shifts[1].label).to.be.null;
    // excluded
    expect(roster.shifts[1].shiftAllocation.name).to.be.equal('None Found');
    expect(roster.shifts[2].shiftAllocation.name).to.be.equal('Edwina');
    expect(roster.shifts[6].types).to.be.eql([shiftTypes.standard, shiftTypes.reference]);
    expect(edwina.breakTime).to.equal(0);
    expect(rowena.breakTime).to.equal(60);
    expect(roster.shiftsByDays[0].header).to.be.eql('Monday, 6th February 2017 - Pay Week');

    expect(edwina.hoursByDayOfWeek.payweek.Mon.start.getHours()).to.eql(9);
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

    const firstNegStart = new Date('2017-02-07T08:00:00');
    const firstNegEnd = new Date('2017-02-07T09:00:00');
    const edwinaNeg = edwina.unavailabilities.find(unavailability => unavailability.type === unavailabilityTypes.neg);
    expect(edwinaNeg.start).to.eql(firstNegStart);
    expect(edwinaNeg.end).to.eql(firstNegEnd);
    expect(edwinaNeg.reason).to.eql('Do not want to work');

    const expectedEdwinaLeave = new Unavailability({
      start: new Date('2017-02-07T00:00:00'),
      end: new Date('2017-02-07T23:59:59.999'),
      reason: 'Holiday',
      type: unavailabilityTypes.leave,
    });
    const edwinaLeave = edwina.unavailabilities.find(unavailability => unavailability.type === unavailabilityTypes.leave);
    expect(edwinaLeave).to.eql(expectedEdwinaLeave);
    const expectedRowenaLeave = new Unavailability({
      start: new Date('2017-02-10T00:00:00'),
      end: new Date('2017-02-15T23:59:59.999'),
      reason: null,
      type: unavailabilityTypes.leave,
    });
    expect(rowena.unavailabilities[0]).to.eql(expectedRowenaLeave);
  };

  const loadRoster = path =>
    shifty.run(path).then((theRunResult) => {
      runResult = theRunResult;
    });

  context('runs normal', () => {
    beforeEach(() => loadRoster('./data/shifty.xlsx'));
    it('parses data from a spreadsheet', () => {
      runTests();
    });
  });

  context('runs broken', () => {
    beforeEach(() => loadRoster('./data/shifty_broken.xlsx'));
    it('generates errors when columns are invalid', () => {
      const { errors } = runResult;
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
