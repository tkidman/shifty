'use strict';
const chai = require('chai');
const expect = chai.expect;
const Employee = require('../../src/domain/employee');
const Shift = require('../../src/domain/shift');
const shiftTypes = require('../../src/domain/shift-type');
const hewLevels = require('../../src/domain/hew-level');
const adjustTimezoneOffset = require('../../src/common').adjustTimezoneOffset;

describe('Employee', () => {
  let employee;
  let shift;
  let sameTimeShift;
  let nightShift;

  beforeEach(() => {
    shift = new Shift({
      type: shiftTypes.standard,
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
    employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel4, averageWeeklyHours: 10, aal: true });
    employee.markAsAvailableForShift(shift);
    employee.markAsAvailableForShift(sameTimeShift);
  });

  context('can work shift', () => {
    it('returns true when employee is available for the shift', () => {
      expect(employee.canWorkShift(shift)).to.be.true;
      expect(employee.canWorkShift(sameTimeShift)).to.be.true;
    });

    it('returns false after the employee gets allocated to the shift', () => {
      employee.allocateToShift(shift);
      expect(employee.canWorkShift(shift)).to.be.false;
    });
  });

  context('allocates to shift', () => {
    beforeEach(() => {
      employee.allocateToShift(shift);
    });

    it('adds employee to the shift', () => {
      expect(shift.allocatedEmployees.includes(employee)).to.be.true;
    });

    it('adds the shift to the employee', () => {
      expect(employee.allocatedShifts.includes(shift)).to.be.true;
    });

    it('removes the shift from the employee\'s available shifts', () => {
      expect(employee.availableForShifts.includes(shift)).to.be.false;
    });

    it('removes the employee from the shifts\'s available employees', () => {
      expect(shift.availableEmployees.includes(employee)).to.be.false;
    });

    it('removes the same time shift from the employee\'s available shifts', () => {
      expect(employee.availableForShifts.includes(sameTimeShift)).to.be.false;
    });

    it('removes the employee from the same time shifts\'s available employees', () => {
      expect(sameTimeShift.availableEmployees.includes(employee)).to.be.false;
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

  context('currentHoursAllocated', () => {
    it('reports correct minutes when no shifts allocated', () => {
      expect(employee.getCurrentMinutesAllocated()).to.eql(0);
    });

    it('reports correct minutes when shifts allocated', () => {
      employee.allocateToShift(shift);
      employee.allocateToShift(nightShift);
      expect(employee.getCurrentMinutesAllocated()).to.eql(300);
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

      employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel4, averageWeeklyHours: 10 });
      // date doesn't matter here, only time
      employee.hoursByDayOfWeek = { Mon: { start: new Date(new Date().setHours(8)), end: new Date(new Date().setHours(17)) } };
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

      employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel4, averageWeeklyHours: 10 });
      employee.allocateToShift(shift);
    });

    it('returns correct value when employee working adjacent shift', () => {
      expect(employee.workingAdjacentShift(after)).to.be.true;
      expect(employee.workingAdjacentShift(before)).to.be.true;
      expect(employee.workingAdjacentShift(nightShift)).to.be.false;
    });
  });
});
