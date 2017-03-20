'use strict';
const chai = require('chai');
const expect = chai.expect;
const Employee = require('../../src/domain/employee');
const Shift = require('../../src/domain/shift');
const shiftTypes = require('../../src/domain/shift-type').shiftTypes;
const hewLevels = require('../../src/domain/hew-level');
const adjustTimezoneOffset = require('../../src/common').adjustTimezoneOffset;

describe('Shift', () => {
  let employee;
  // 1 hour shift
  let standardShift;
  // 4 hour shift
  let nightShift;
  let aalShift1;
  let aalShift2;

  const tenHourDay = { start: new Date(new Date().setHours(8)), end: new Date(new Date().setHours(18)) };
  const thirtyHourWeek = { Mon: tenHourDay, Tue: tenHourDay, Wed: tenHourDay };
  const hoursByDayOfWeek = { payweek: thirtyHourWeek, nonPayweek: thirtyHourWeek };

  beforeEach(() => {
    standardShift = new Shift({
      type: shiftTypes.standard,
      start: adjustTimezoneOffset(new Date('2017-02-06T09:00:00')),
      end: adjustTimezoneOffset(new Date('2017-02-06T10:00:00')),
    });
    aalShift1 = new Shift({
      type: shiftTypes.aal,
      start: adjustTimezoneOffset(new Date('2017-02-06T11:00:00')),
      end: adjustTimezoneOffset(new Date('2017-02-06T12:00:00')),
    });
    aalShift2 = new Shift({
      type: shiftTypes.aal,
      start: adjustTimezoneOffset(new Date('2017-02-06T13:00:00')),
      end: adjustTimezoneOffset(new Date('2017-02-06T15:00:00')),
    });
    nightShift = new Shift({
      type: shiftTypes.standard,
      start: adjustTimezoneOffset(new Date('2017-02-06T17:00:00')),
      end: adjustTimezoneOffset(new Date('2017-02-06T21:00:00')),
    });
    employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel5, aal: true, hoursByDayOfWeek });
    employee.idealMinMinutes = 300;
    employee.idealMaxMinutes = 600;
    employee.markAsAvailableForShift(standardShift);
  });

  context('scoreEmployee', () => {
    it('returns the correct score when under minimum minutes', () => {
      const empScore = standardShift.scoreEmployee(employee);
      expect(empScore.score).to.eql(-1000 - employee.idealMinMinutes + standardShift.getShiftLengthMinutes());
    });

    it('returns the correct score when over minimum minutes and under ideal minutes', () => {
      nightShift.allocateShift(employee);
      const score = standardShift.scoreEmployee(employee);
      const expectedScore = nightShift.getShiftLengthMinutes() + standardShift.getShiftLengthMinutes() - employee.idealMinMinutes;
      expect(score.score).to.eql(expectedScore);
    });

    it('returns the correct score when over ideal min minutes and under ideal max minutes', () => {
      // between 5 and 10
      for (let i = 0; i < 8; i++) {
        standardShift.allocateShift(employee);
      }
      const score = standardShift.scoreEmployee(employee);
      expect(score.score).to.eql(0);
    });

    it('returns the correct score when over ideal max minutes', () => {
      for (let i = 0; i < 10; i++) {
        standardShift.allocateShift(employee);
      }
      const score = standardShift.scoreEmployee(employee);
      expect(score.score).to.eql(60);
    });

    it('returns the correct score when AAL shift and employee has worked 1 AAL shifts', () => {
      aalShift1.allocateShift(employee);
      const scoreResult = { score: 0 };
      aalShift2.scoreAAL(employee, scoreResult);
      expect(scoreResult.score).to.eql(2000);
    });
  });

  context('with low, mid and high scoring employees', () => {
    let lowEmployee;

    beforeEach(() => {
      lowEmployee = new Employee({ name: 'lowEmpy', hewLevel: hewLevels.hewLevel5, hoursByDayOfWeek });
      const midEmployee = new Employee({ name: 'midEmpy', hewLevel: hewLevels.hewLevel5, hoursByDayOfWeek });
      standardShift.allocateShift(midEmployee);
      const highEmployee = new Employee({ name: 'highEmpy', hewLevel: hewLevels.hewLevel5, hoursByDayOfWeek });
      new Shift({
        type: shiftTypes.standard,
        start: adjustTimezoneOffset(new Date('2017-02-06T17:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-06T21:00:00')),
      }).allocateShift(highEmployee);
      highEmployee.markAsAvailableForShift(nightShift);
      lowEmployee.markAsAvailableForShift(nightShift);
      midEmployee.markAsAvailableForShift(nightShift);
    });

    context('findBestEmployee', () => {
      it('returns the employee with the lowest score', () => {
        expect(nightShift.findBestEmployee().employee).to.equal(lowEmployee);
      });
    });

    context('fill', () => {
      it('fills the shift with the right amount of workers', () => {
        expect(nightShift.shiftAllocation).to.be.null;
        nightShift.fill();
        expect(nightShift.shiftAllocation.employee).to.equal(lowEmployee);
      });
    });
  });

  context('fill', () => {
    it('generates warnings correctly', () => {
      employee = new Employee({ name: 'umpy', hewLevel: hewLevels.hewLevel5, hoursByDayOfWeek, aal: false });
      employee.markAsAvailableForShift(aalShift1);
      aalShift1.fill();
      expect(aalShift1.shiftAllocation.warningsList.length).to.eql(1);
      expect(aalShift1.shiftAllocation.warningsList[0]).to.equal('umpy should not perform AAL shifts');
    });
  });

  context('allocateShift', () => {
    let sameTimeShift;
    beforeEach(() => {
      sameTimeShift = new Shift({
        type: shiftTypes.aal,
        start: adjustTimezoneOffset(new Date('2017-02-06T09:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-06T10:00:00')),
      });
      employee.markAsAvailableForShift(sameTimeShift);
      standardShift.allocateShift(employee);
    });

    it('allocates employee to the shift', () => {
      expect(standardShift.shiftAllocation.employee).to.equal(employee);
    });

    it('removes the employee from the shifts\'s available employees', () => {
      expect(standardShift.availableEmployees.includes(employee)).to.be.false;
    });

    it('removes the employee from the same time shifts\'s available employees', () => {
      expect(standardShift.availableEmployees.includes(employee)).to.be.false;
    });
  });

  context('shift length in minutes', () => {
    it('calculates minutes correctly', () => {
      expect(standardShift.getShiftLengthMinutes()).to.equal(60);
      expect(nightShift.getShiftLengthMinutes()).to.equal(240);
    });
  });

  context('toString', () => {
    it('converts to a string', () => {
      expect(`${standardShift}`).to.eql('6/2/2017 09:00-10:00 Standard');
    });
  });
});
