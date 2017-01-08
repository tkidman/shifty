'use strict';
const chai = require('chai');
const expect = chai.expect;
const Employee = require('../../src/domain/employee');
const Shift = require('../../src/domain/shift');
const shiftTypes = require('../../src/domain/shift-type');
const hewLevels = require('../../src/domain/hew-level');

describe('Shift', () => {
  let employee;
  let shift;

  beforeEach(() => {
    shift = new Shift({ type: shiftTypes.standard });
    employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel3, averageWeeklyHours: 38 });
    employee.markAsAvailableForShift(shift);
  });

  context('scoreEmployee', () => {
    it('returns the correct score when under minimum hours', () => {
      expect(shift.scoreEmployee(employee)).to.eql(-40 - employee.idealMinHours + shift.type.length);
    });
  });
});
