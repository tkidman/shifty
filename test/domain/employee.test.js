'use strict';
const chai = require('chai');
const expect = chai.expect;
const Employee = require('../../src/domain/employee');
const Shift = require('../../src/domain/shift');
const shiftTypes = require('../../src/domain/shift-type').shiftTypes;
const hewLevels = require('../../src/domain/hew-level');
const adjustTimezoneOffset = require('../../src/common').adjustTimezoneOffset;

describe('Employee', () => {
  let employee;
  let shift;
  let sameTimeShift;
  let nightShift;
  let backupShift;
  const tenHourDay = { start: new Date(new Date().setHours(8)), end: new Date(new Date().setHours(18)) };
  const tenHourWeek = { Mon: tenHourDay };
  const hoursByDayOfWeek = { payweek: tenHourWeek, nonPayweek: tenHourWeek };

  beforeEach(() => {
    shift = new Shift({
      type: shiftTypes.standard,
      // monday
      start: adjustTimezoneOffset(new Date('2017-02-06T09:00:00')),
      end: adjustTimezoneOffset(new Date('2017-02-06T10:00:00')),
    });
    sameTimeShift = new Shift({
      type: shiftTypes.standard,
      start: adjustTimezoneOffset(new Date('2017-02-06T09:00:00')),
      end: adjustTimezoneOffset(new Date('2017-02-06T11:00:00')),
    });
    nightShift = new Shift({
      type: shiftTypes.standard,
      start: adjustTimezoneOffset(new Date('2017-02-06T17:00:00')),
      end: adjustTimezoneOffset(new Date('2017-02-06T21:00:00')),
    });
    backupShift = new Shift({
      type: shiftTypes.backup,
      start: adjustTimezoneOffset(new Date('2017-02-07T17:00:00')),
      end: adjustTimezoneOffset(new Date('2017-02-07T21:00:00')),
    });
    employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel4, aal: true, hoursByDayOfWeek });
    employee.markAsAvailableForShift(shift);
    employee.markAsAvailableForShift(sameTimeShift);
  });

  context('can work shift', () => {
    it('returns true when employee is available for the shift', () => {
      expect(employee.canWorkShift(shift)).to.be.true;
      expect(employee.canWorkShift(sameTimeShift)).to.be.true;
    });

    it('returns false after the employee gets allocated to the shift', () => {
      shift.allocateShift(employee);
      expect(employee.canWorkShift(shift)).to.be.false;
    });
  });

  context('allocates to shift', () => {
    beforeEach(() => {
      shift.allocateShift(employee);
    });

    it('adds the shift to the employee', () => {
      expect(employee.shiftAllocations.some(shiftAllocation => shiftAllocation.shift === shift)).to.be.true;
    });

    it('removes the shift from the employee\'s available shifts', () => {
      expect(employee.availableForShifts.includes(shift)).to.be.false;
    });

    it('removes the same time shift from the employee\'s available shifts', () => {
      expect(employee.availableForShifts.includes(sameTimeShift)).to.be.false;
    });
  });

  context('constructor', () => {
    it('sets ideal min minutes', () => {
      expect(employee.idealMinMinutes).to.eql(300);
    });

    it('sets ideal max minutes', () => {
      expect(employee.idealMaxMinutes).to.eql(600);
    });
  });

  context('currentMinutesAllocated', () => {
    it('reports correct minutes when no shifts allocated', () => {
      expect(employee.getCurrentMinutesAllocated()).to.eql(0);
    });

    it('reports correct minutes when shifts allocated', () => {
      shift.allocateShift(employee);
      nightShift.allocateShift(employee);
      expect(employee.getCurrentMinutesAllocated()).to.eql(300);
    });

    it('reports correct minutes when shifts allocated excluding backup', () => {
      shift.allocateShift(employee);
      backupShift.allocateShift(employee);
      expect(employee.getCurrentMinutesAllocatedExcludingBackup()).to.eql(60);
    });
  });

  context('getAALShiftCount', () => {
    it('counts the number of assigned aal shifts', () => {
      shift.allocateShift(employee);
      expect(employee.getAALShiftCount()).to.eql(0);
      shift.allocateShift(employee);
      new Shift({
        type: shiftTypes.aal,
        start: adjustTimezoneOffset(new Date('2017-02-07T09:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-07T10:00:00')),
      }).allocateShift(employee);
      expect(employee.getAALShiftCount()).to.eql(1);
    });
  });

  context('setAvailableForShifts', () => {
    let shift2;

    beforeEach(() => {
      shift2 = new Shift({
        type: shiftTypes.standard,
        start: adjustTimezoneOffset(new Date('2017-02-07T09:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-07T10:00:00')),
      });
      employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel4, hoursByDayOfWeek });
    });

    it('does not set shift when employee does not work during shift', () => {
      employee.setAvailableForShifts([shift2]);
      expect(employee.availableForShifts.length).to.equal(0);
    });

    it('does not set shift when employee has an overlapping neg', () => {
      employee.negs = [{
        start: adjustTimezoneOffset(new Date('2017-02-06T09:30:00')),
        end: adjustTimezoneOffset(new Date('2017-02-06T10:30:00')),
      }];
      employee.setAvailableForShifts([shift]);
      expect(employee.availableForShifts.length).to.equal(0);

      employee.negs = [{
        start: adjustTimezoneOffset(new Date('2017-02-06T08:30:00')),
        end: adjustTimezoneOffset(new Date('2017-02-06T09:30:00')),
      }];
      employee.setAvailableForShifts([shift]);
      expect(employee.availableForShifts.length).to.equal(0);

      employee.negs = [{
        start: adjustTimezoneOffset(new Date('2017-02-06T08:30:00')),
        end: adjustTimezoneOffset(new Date('2017-02-06T10:30:00')),
      }];
      employee.setAvailableForShifts([shift]);
      expect(employee.availableForShifts.length).to.equal(0);
    });

    it('does not set shift when employee has an overlapping rdo', () => {
      employee.rdos = [new Date('2017-02-06T09:30:00')];
      employee.setAvailableForShifts([shift]);
      expect(employee.availableForShifts.length).to.equal(0);
    });
  });

  context('workingAdjacentShift', () => {
    let after;
    let before;

    beforeEach(() => {
      after = new Shift({
        type: shiftTypes.standard,
        start: adjustTimezoneOffset(new Date('2017-02-06T10:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-06T11:00:00')),
      });
      before = new Shift({
        type: shiftTypes.standard,
        start: adjustTimezoneOffset(new Date('2017-02-06T08:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-06T09:00:00')),
      });

      employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel4, hoursByDayOfWeek });
      shift.allocateShift(employee);
    });

    it('returns correct value when employee working adjacent shift', () => {
      expect(employee.workingAdjacentShift(after)).to.be.true;
      expect(employee.workingAdjacentShift(before)).to.be.true;
      expect(employee.workingAdjacentShift(nightShift)).to.be.false;
    });
  });

  context('isInPayweek', () => {
    const payweekDates = [
      adjustTimezoneOffset(new Date('2017-03-13T00:00:00')),
      adjustTimezoneOffset(new Date('2017-03-19T23:59:59')),
      adjustTimezoneOffset(new Date('2017-03-28T09:00:00')),
      adjustTimezoneOffset(new Date('2017-04-12T09:00:00')),
    ];
    const nonPayweekDates = [
      adjustTimezoneOffset(new Date('2017-03-26T23:59:59')),
      adjustTimezoneOffset(new Date('2017-03-20T00:00:00')),
      adjustTimezoneOffset(new Date('2017-04-04T09:00:00')),
      adjustTimezoneOffset(new Date('2017-04-19T09:00:00')),
    ];
    payweekDates.forEach(payweekDate => {
      it(`returns true when date is ${payweekDate}`, () => {
        expect(employee.isInPayweek(payweekDate)).to.be.true;
      });
    });

    nonPayweekDates.forEach(nonPayweekDate => {
      it(`returns false when date is ${nonPayweekDate}`, () => {
        expect(employee.isInPayweek(nonPayweekDate)).to.be.false;
      });
    });
  });

  context('averageWeeklyHours', () => {
    const thirtyHourWeek = { Mon: tenHourDay, Tue: tenHourDay, Wed: tenHourDay };
    const twentyHourWeek = { Mon: tenHourDay, Tue: tenHourDay };
    const hoursByDayOfAnotherWeek = { payweek: thirtyHourWeek, nonPayweek: twentyHourWeek };
    it('calculates average weekly hours', () => {
      expect(employee.calculateAverageWeeklyHours(hoursByDayOfAnotherWeek)).to.equal(25);
    });
  });

  context('hoursWorkedInRoster', () => {
    let shiftsByDays;
    beforeEach(() => {
      shiftsByDays = [{ date: shift.start, shifts: [shift] }];
    });
    it('calculates hours worked', () => {
      expect(employee._calculateMinutesWorkedInRoster(shiftsByDays)).to.eql(10 * 60);
    });
  });
});
