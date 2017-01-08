'use strict';
const chai = require('chai');
const expect = chai.expect;
const Employee = require('../../src/domain/employee');
const Shift = require('../../src/domain/shift');
const shiftTypes = require('../../src/domain/shift-type');
const hewLevels = require('../../src/domain/hew-level');

describe('Employee', () => {
  let employee;
  let shift;

  beforeEach(() => {
    shift = new Shift({ type: shiftTypes.standard });
    employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel4, averageWeeklyHours: 10 });
    employee.markAsAvailableForShift(shift);
  });

  context('can work shift', () => {
    it('returns true when employee is available for the shift', () => {
      expect(employee.canWorkShift(shift)).to.be.true;
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
  });

  context('constructor', () => {
    it('sets ideal min hours', () => {
      expect(employee.idealMinHours).to.eql(5);
    });

    it('sets ideal max hours', () => {
      expect(employee.idealMaxHours).to.eql(10);
    });
  });

  context('currentHoursAllocated', () => {
    it('reports correct hours when no shifts allocated', () => {
      expect(employee.getCurrentHoursAllocated()).to.eql(0);
    });

    it('reports correct hours when shifts allocated', () => {
      employee.allocateToShift(new Shift({ type: shiftTypes.night }));
      employee.allocateToShift(new Shift({ type: shiftTypes.standard }));
      expect(employee.getCurrentHoursAllocated()).to.eql(5);
    });
  });
});
