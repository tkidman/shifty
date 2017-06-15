'use strict';
const chai = require('chai');
const expect = chai.expect;
const Employee = require('../../src/domain/employee');
const Shift = require('../../src/domain/shift').Shift;
const ShiftAllocation = require('../../src/domain/shift-allocation');
const shiftTypes = require('../../src/domain/shift-type').shiftTypes;
const hewLevels = require('../../src/domain/hew-level');
const adjustTimezoneOffset = require('../../src/common').adjustTimezoneOffset;
const moment = require('moment');

describe('Employee', () => {
  let employee;
  let employeeParams;
  let shift;
  let sameTimeShift;
  let nightShift;
  let backupShift;
  let standardShiftTypes;
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
    standardShiftTypes = [shiftTypes.aal, shiftTypes.standard, shiftTypes.backup];
    employeeParams = {
      name: 'empy',
      hewLevel: hewLevels.hewLevel4,
      shiftTypes: standardShiftTypes,
      hoursByDayOfWeek,
      breakTime: 0,
    };
    employee = new Employee(employeeParams);
    employee.markAsAvailableForShift(shift);
    employee.markAsAvailableForShift(sameTimeShift);
  });

  context('can work shift', () => {
    it('returns true when employee is available for the shift', () => {
      expect(employee.canWorkShift(shift)).to.be.true;
      expect(employee.canWorkShift(sameTimeShift)).to.be.true;
    });

    it('returns false after the employee gets allocated to the shift', () => {
      shift.allocateShift(new ShiftAllocation(shift, employee));
      expect(employee.canWorkShift(shift)).to.be.false;
    });
  });

  context('allocates to shift', () => {
    beforeEach(() => {
      shift.allocateShift(new ShiftAllocation(shift, employee));
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

    it('adds the employee to the same time shift\'s list of employees working at the same time', () => {
      expect(sameTimeShift.workingShiftAtSameTimeEmployees.includes(employee)).to.be.true;
    });
  });

  context('currentMinutesAllocated', () => {
    it('reports correct minutes when no shifts allocated', () => {
      expect(employee.getCurrentMinutesAllocated()).to.eql(0);
    });

    it('reports correct minutes when shifts allocated', () => {
      shift.allocateShift(new ShiftAllocation(shift, employee));
      nightShift.allocateShift(new ShiftAllocation(nightShift, employee));
      expect(employee.getCurrentMinutesAllocated()).to.eql(300);
    });

    it('reports correct minutes when shifts allocated excluding backup', () => {
      shift.allocateShift(new ShiftAllocation(shift, employee));
      backupShift.allocateShift(new ShiftAllocation(backupShift, employee));
      expect(employee.getCurrentMinutesAllocatedExcludingBackup()).to.eql(60);
    });
  });

  context('getAALShiftCount', () => {
    it('counts the number of assigned aal shifts', () => {
      shift.allocateShift(new ShiftAllocation(shift, employee));
      expect(employee.getAALShiftCount()).to.eql(0);
      shift.allocateShift(new ShiftAllocation(shift, employee));
      const aalShift = new Shift({
        type: shiftTypes.aal,
        start: adjustTimezoneOffset(new Date('2017-02-07T09:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-07T10:00:00')),
      });
      aalShift.allocateShift(new ShiftAllocation(aalShift, employee));
      expect(employee.getAALShiftCount()).to.eql(1);
    });
  });

  context('shift queries', () => {
    let shift2;

    beforeEach(() => {
      shift2 = new Shift({
        type: shiftTypes.standard,
        start: adjustTimezoneOffset(new Date('2017-02-07T09:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-07T10:00:00')),
      });
      employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel4, hoursByDayOfWeek, shiftTypes: standardShiftTypes });
    });

    context('worksDuringShift', () => {
      it('returns true when employee works during shift', () => {
        expect(employee.worksDuringShift(shift)).to.be.true;
      });

      it('returns false when employee does not work during shift', () => {
        expect(employee.worksDuringShift(shift2)).to.be.false;
      });
    });

    context('negDuringShift', () => {
      it('returns true when employee has an overlapping neg', () => {
        employee.negs = [{
          start: adjustTimezoneOffset(new Date('2017-02-06T09:30:00')),
          end: adjustTimezoneOffset(new Date('2017-02-06T10:30:00')),
        }];
        expect(employee.negDuringShift(shift)).to.be.true;

        employee.negs = [{
          start: adjustTimezoneOffset(new Date('2017-02-06T08:30:00')),
          end: adjustTimezoneOffset(new Date('2017-02-06T09:30:00')),
        }];
        expect(employee.negDuringShift(shift)).to.be.true;

        employee.negs = [{
          start: adjustTimezoneOffset(new Date('2017-02-06T08:30:00')),
          end: adjustTimezoneOffset(new Date('2017-02-06T10:30:00')),
        }];
        expect(employee.negDuringShift(shift)).to.be.true;
      });

      it('returns false when employee does not have an overlapping neg', () => {
        employee.negs = [{
          start: adjustTimezoneOffset(new Date('2017-02-07T08:30:00')),
          end: adjustTimezoneOffset(new Date('2017-02-07T09:30:00')),
        }];
        expect(employee.negDuringShift(shift)).to.be.false;
      });
    });

    context('leaveDuringShift', () => {
      it('returns true when employee has overlapping leave', () => {
        employee.leave = [{
          start: moment(adjustTimezoneOffset(new Date('2017-02-06T12:00:00'))).startOf('day').toDate(),
          end: moment(adjustTimezoneOffset(new Date('2017-02-06T12:00:00'))).endOf('day').toDate(),
        }];
        expect(employee.onLeaveDuringShift(shift)).to.be.true;
      });

      it('returns false when employee has overlapping leave', () => {
        employee.leave = [{
          start: moment(adjustTimezoneOffset(new Date('2017-02-07T12:00:00'))).startOf('day').toDate(),
          end: moment(adjustTimezoneOffset(new Date('2017-02-07T12:00:00'))).endOf('day').toDate(),
        }];
        expect(employee.onLeaveDuringShift(shift)).to.be.false;
      });
    });
  });

  context('workingAdjacentShift', () => {
    let after;
    let before;
    let nextDay;

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
      nextDay = new Shift({
        type: shiftTypes.standard,
        start: adjustTimezoneOffset(new Date('2017-02-07T08:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-07T09:00:00')),
      });

      employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel4, hoursByDayOfWeek, shiftTypes: standardShiftTypes });
      shift.allocateShift(new ShiftAllocation(shift, employee));
    });

    it('returns correct value when employee working adjacent shift', () => {
      expect(employee.workingAdjacentShift(after)).to.be.true;
      expect(employee.workingAdjacentShift(before)).to.be.true;
      expect(employee.workingAdjacentShift(nightShift)).to.be.true;
      expect(employee.workingAdjacentShift(nextDay)).to.be.false;
    });
  });

  context('hoursWorkedInRoster', () => {
    let shiftsByDays;
    let anotherShift;

    beforeEach(() => {
      anotherShift = new Shift({
        type: shiftTypes.standard,
        // tuesday
        start: adjustTimezoneOffset(new Date('2017-02-07T09:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-07T10:00:00')),
      });
      shiftsByDays = [{ date: shift.start, shifts: [shift] }, { date: anotherShift.start, shifts: [anotherShift] }];
    });

    it('calculates hours worked', () => {
      expect(employee._calculateMinutesWorkedInRoster(shiftsByDays)).to.eql(10 * 60);
    });

    it('doesn\'t include annual leave', () => {
      employee.leave = [{
        start: moment(adjustTimezoneOffset(new Date('2017-02-06T12:00:00'))).startOf('day').toDate(),
        end: moment(adjustTimezoneOffset(new Date('2017-02-06T12:00:00'))).endOf('day').toDate(),
      }];
      expect(employee._calculateMinutesWorkedInRoster(shiftsByDays)).to.eql(0);
    });

    it('subtracts breakTime', () => {
      employeeParams.breakTime = 30;
      expect(new Employee(employeeParams)._calculateMinutesWorkedInRoster(shiftsByDays)).to.eql((10 * 60) - 30);
    });

    it('subtracts default breakTime', () => {
      delete employeeParams.breakTime;
      expect(new Employee(employeeParams)._calculateMinutesWorkedInRoster(shiftsByDays)).to.eql((10 * 60) - 60);
    });

    it('includes manual shifts', () => {
      employee.shiftAllocations.push(new ShiftAllocation(anotherShift, employee));
      expect(employee._calculateMinutesWorkedInRoster(shiftsByDays)).to.eql(10 * 60 + 60);
    });

    it('sets ideal min minutes', () => {
      employee.setMinutesWorkedInRoster(shiftsByDays);
      expect(employee.idealMinMinutes).to.eql(300);
    });

    it('sets ideal max minutes', () => {
      employee.setMinutesWorkedInRoster(shiftsByDays);
      expect(employee.idealMaxMinutes).to.eql(600);
    });
  });

  context('getPercentageDeskHours', () => {
    it('returns nicely formatted string', () => {
      employee.minutesWorkedInRoster = 999;
      expect(employee.getPercentageDeskHours()).to.equal('0 %');
      shift.allocateShift(new ShiftAllocation(shift, employee));
      employee.minutesWorkedInRoster = 999;
      expect(employee.getPercentageDeskHours()).to.equal('6.01 %');
      employee.minutesWorkedInRoster = 60;
      expect(employee.getPercentageDeskHours()).to.equal('100 %');
      employee.minutesWorkedInRoster = undefined;
      expect(employee.getPercentageDeskHours()).to.equal('N/A');
    });
  });
});
