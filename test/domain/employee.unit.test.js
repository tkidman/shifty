'use strict';
const chai = require('chai');
const expect = chai.expect;
const Employee = require('../../src/domain/employee');
const Shift = require('../../src/domain/shift');
const shiftTypes = require('../../src/domain/shiftType');

describe('Employee', () => {
  let employee;
  let shift;

  beforeEach(() => {
    shift = new Shift({ type: shiftTypes.standard });
    employee = new Employee({ name: 'empy', hewLevel: 2 });
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
});
