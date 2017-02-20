'use strict';
const chai = require('chai');
const expect = chai.expect;
const Employee = require('../../src/domain/employee');
const Shift = require('../../src/domain/shift');
const shiftTypes = require('../../src/domain/shift-type');
const hewLevels = require('../../src/domain/hew-level');
const adjustTimezoneOffset = require('../../src/common').adjustTimezoneOffset;

describe('Shift', () => {
  let employee;
  // 1 hour shift
  let standardShift;
  // 4 hour shift
  let nightShift;

  beforeEach(() => {
    standardShift = new Shift({
      type: shiftTypes.standard,
      start: adjustTimezoneOffset(new Date('2017-02-06T09:00:00')),
      end: adjustTimezoneOffset(new Date('2017-02-06T10:00:00')),
    });
    nightShift = new Shift({
      type: shiftTypes.standard,
      start: adjustTimezoneOffset(new Date('2017-02-06T17:00:00')),
      end: adjustTimezoneOffset(new Date('2017-02-06T21:00:00')),
    });
    employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel5, averageWeeklyHours: 30 });
    employee.markAsAvailableForShift(standardShift);
  });

  context('scoreEmployee', () => {
    it('returns the correct score when under minimum minutes', () => {
      const empScore = standardShift.scoreEmployee(employee);
      expect(empScore.score).to.eql(-1000 - employee.idealMinMinutes + standardShift.getShiftLengthMinutes());
    });

    it('returns the correct score when over minimum minutes and under ideal minutes', () => {
      employee.allocateToShift(nightShift);
      const score = standardShift.scoreEmployee(employee);
      expect(score.score).to.eql(nightShift.getShiftLengthMinutes() + standardShift.getShiftLengthMinutes() - employee.idealMinMinutes);
    });

    it('returns the correct score when over ideal min minutes and under ideal max minutes', () => {
      // between 12 and 15
      for (let i = 0; i < 13; i++) {
        employee.allocateToShift(standardShift);
      }
      const score = standardShift.scoreEmployee(employee);
      expect(score.score).to.eql(0);
    });

    it('returns the correct score when over ideal max minutes', () => {
      for (let i = 0; i <= 14; i++) {
        employee.allocateToShift(standardShift);
      }
      const score = standardShift.scoreEmployee(employee);
      expect(score.score).to.eql(60);
    });
  });

  context('with low, mid and high scoring employees', () => {
    let lowEmployee;

    beforeEach(() => {
      lowEmployee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel5, averageWeeklyHours: 30 });
      const midEmployee = new Employee({ name: 'empo', hewLevel: hewLevels.hewLevel5, averageWeeklyHours: 30 });
      midEmployee.allocateToShift(standardShift);
      const highEmployee = new Employee({ name: 'empi', hewLevel: hewLevels.hewLevel5, averageWeeklyHours: 30 });
      highEmployee.allocateToShift(new Shift({
        type: shiftTypes.standard,
        start: adjustTimezoneOffset(new Date('2017-02-06T17:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-06T21:00:00')),
      }));
      highEmployee.markAsAvailableForShift(nightShift);
      lowEmployee.markAsAvailableForShift(nightShift);
      midEmployee.markAsAvailableForShift(nightShift);
    });

    context('findBestEmployee', () => {
      it('returns the employee with the lowest score', () => {
        expect(nightShift.findBestEmployee()).to.equal(lowEmployee);
      });
    });

    context('fill', () => {
      it('fills the shift with the right amount of workers', () => {
        expect(nightShift.allocatedEmployees.length).to.equal(0);
        nightShift.fill();
        expect(nightShift.allocatedEmployees.length).to.equal(1);
      });
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
