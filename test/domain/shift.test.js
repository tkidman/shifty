'use strict';
const chai = require('chai');
const expect = chai.expect;
const Employee = require('../../src/domain/employee');
const Shift = require('../../src/domain/shift');
const shiftTypes = require('../../src/domain/shift-type');
const hewLevels = require('../../src/domain/hew-level');

describe('Shift', () => {
  let employee;
  // 1 hour shift
  let standardShift;
  // 4 hour shift
  let nightShift;

  beforeEach(() => {
    standardShift = new Shift({ type: shiftTypes.standard });
    nightShift = new Shift({ type: shiftTypes.night });
    employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel5, averageWeeklyHours: 30 });
    employee.markAsAvailableForShift(standardShift);
  });

  context('scoreEmployee', () => {
    it('returns the correct score when under minimum hours', () => {
      expect(standardShift.scoreEmployee(employee)).to.eql(-40 - employee.idealMinHours + standardShift.type.length);
    });

    it('returns the correct score when over minimum hours and under ideal hours', () => {
      employee.allocateToShift(nightShift);
      const score = standardShift.scoreEmployee(employee);
      expect(score).to.eql(nightShift.type.length + standardShift.type.length - employee.idealMinHours);
    });

    it('returns the correct score when over ideal min hours and under ideal max hours', () => {
      // between 12 and 15
      for (let i = 0; i < 13; i++) {
        employee.allocateToShift(new Shift({ type: shiftTypes.standard }));
      }
      const score = standardShift.scoreEmployee(employee);
      expect(score).to.eql(0);
    });

    it('returns the correct score when over ideal max hours', () => {
      for (let i = 0; i <= 14; i++) {
        employee.allocateToShift(new Shift({ type: shiftTypes.standard }));
      }
      const score = standardShift.scoreEmployee(employee);
      expect(score).to.eql(1);
    });
  });

  context('with low, mid and high employees', () => {
    let lowEmployee;

    beforeEach(() => {
      lowEmployee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel5, averageWeeklyHours: 30 });
      const midEmployee = new Employee({ name: 'empo', hewLevel: hewLevels.hewLevel5, averageWeeklyHours: 30 });
      midEmployee.allocateToShift(new Shift({ type: shiftTypes.standard }));
      const highEmployee = new Employee({ name: 'empi', hewLevel: hewLevels.hewLevel5, averageWeeklyHours: 30 });
      highEmployee.allocateToShift(new Shift({ type: shiftTypes.night }));
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
        expect(nightShift.allocatedEmployees.length).to.equal(nightShift.type.numEmployees);
      });
    });
  });
});
