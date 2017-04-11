'use strict';
const chai = require('chai');
const expect = chai.expect;
const Employee = require('../../src/domain/employee');
const Shift = require('../../src/domain/shift').Shift;
const scoreConstants = require('../../src/domain/shift').scoreConstants;
const shiftTypes = require('../../src/domain/shift-type').shiftTypes;
const ShiftAllocation = require('../../src/domain/shift-allocation');
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
  let standardShiftTypes;

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
      label: 'Carlton swap',
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
    standardShiftTypes = [shiftTypes.aal, shiftTypes.standard, shiftTypes.backup];
    employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel5, hoursByDayOfWeek, shiftTypes: standardShiftTypes });
    employee.idealMinMinutes = 300;
    employee.idealMaxMinutes = 600;
    employee.markAsAvailableForShift(standardShift);
  });

  context('scoreEmployee', () => {
    it('returns the correct score when under minimum minutes', () => {
      const empScore = standardShift.getPotentialShiftAllocation(employee);
      const expectedScore = standardShift.getShiftLengthMinutes() - employee.idealMinMinutes + scoreConstants.minMinutesScoreChange;
      expect(empScore.score).to.eql(expectedScore);
    });

    it('returns the correct score when over minimum minutes and under ideal minutes', () => {
      nightShift.allocateShift(new ShiftAllocation(nightShift, employee));
      const score = standardShift.getPotentialShiftAllocation(employee);
      const expectedScore = nightShift.getShiftLengthMinutes() + standardShift.getShiftLengthMinutes() - employee.idealMinMinutes;
      expect(score.score).to.eql(expectedScore);
    });

    it('returns the correct score when over ideal min minutes and under ideal max minutes', () => {
      // between 5 and 10
      for (let i = 0; i < 8; i++) {
        standardShift.allocateShift(new ShiftAllocation(standardShift, employee));
      }
      const score = standardShift.getPotentialShiftAllocation(employee);
      expect(score.score).to.eql(0);
    });

    it('returns the correct score when over ideal max minutes', () => {
      for (let i = 0; i < 10; i++) {
        standardShift.allocateShift(new ShiftAllocation(standardShift, employee));
      }
      const score = standardShift.getPotentialShiftAllocation(employee);
      expect(score.score).to.eql(60);
    });

    it('returns the correct score when AAL shift and employee has worked 1 AAL shifts', () => {
      aalShift2.allocateShift(new ShiftAllocation(aalShift2, employee));
      const aalScoreResult = aalShift1.getPotentialShiftAllocation(employee);
      const standardScoreResult = standardShift.getPotentialShiftAllocation(employee);
      expect(aalScoreResult.score - standardScoreResult.score).to.eql(scoreConstants.workingAALShiftScoreChange);
    });

    it('returns the correct score when employee does not have the shift type', () => {
      const initialScore = standardShift.getPotentialShiftAllocation(employee);
      employee.shiftTypes = [];
      const noShiftTypeScore = standardShift.getPotentialShiftAllocation(employee);
      expect(noShiftTypeScore.score - initialScore.score).to.eql(scoreConstants.shouldNotPerformShiftTypeScoreChange);
    });
  });

  context('with low, mid and high scoring employees', () => {
    let lowEmployee;

    beforeEach(() => {
      lowEmployee = new Employee({
        name: 'lowEmpy',
        hewLevel: hewLevels.hewLevel5,
        hoursByDayOfWeek,
        shiftTypes: standardShiftTypes,
      });
      const midEmployee = new Employee({
        name: 'midEmpy',
        hewLevel: hewLevels.hewLevel5,
        hoursByDayOfWeek,
        shiftTypes: standardShiftTypes,
      });
      standardShift.allocateShift(new ShiftAllocation(standardShift, midEmployee));
      const highEmployee = new Employee({
        name: 'highEmpy',
        hewLevel: hewLevels.hewLevel5,
        hoursByDayOfWeek,
        shiftTypes: standardShiftTypes,
      });
      const standardShift2 = new Shift({
        type: shiftTypes.standard,
        start: adjustTimezoneOffset(new Date('2017-02-06T17:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-06T21:00:00')),
      });
      standardShift2.allocateShift(new ShiftAllocation(standardShift2, highEmployee));
      highEmployee.markAsAvailableForShift(nightShift);
      lowEmployee.markAsAvailableForShift(nightShift);
      midEmployee.markAsAvailableForShift(nightShift);
    });

    context('findBestEmployee', () => {
      it('returns the employee with the lowest score', () => {
        expect(nightShift.findBestShiftAllocation().employee).to.equal(lowEmployee);
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
      employee = new Employee({
        name: 'umpy',
        hewLevel: hewLevels.hewLevel5,
        hoursByDayOfWeek,
        shiftTypes: standardShiftTypes.filter(shiftType => shiftType !== shiftTypes.aal),
      });
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
      standardShift.allocateShift(new ShiftAllocation(standardShift, employee));
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

  context('getTypeAndLabel', () => {
    it('returns correct string', () => {
      expect(standardShift.getTypeAndLabel()).to.eql('Standard');
      expect(aalShift1.getTypeAndLabel()).to.eql('AAL - Carlton swap');
    });
  });

  context('isNightShift', () => {
    it('is a night shift when it ends after 6:30pm', () => {
      standardShift.end = adjustTimezoneOffset(new Date('2017-02-06T18:31:00'));
      expect(standardShift.isNightShift()).to.be.true;
    });

    it('is not a night shift when it ends before 6:30pm', () => {
      standardShift.end = adjustTimezoneOffset(new Date('2017-02-06T18:29:00'));
      expect(standardShift.isNightShift()).to.be.false;
    });
  });

  context('isMorningShift', () => {
    it('is a morning shift when it starts before 9:00am', () => {
      standardShift.start = adjustTimezoneOffset(new Date('2017-02-06T08:55:00'));
      expect(standardShift.isMorningShift()).to.be.true;
    });

    it('is not a morning shift when it starts after 9:00am', () => {
      standardShift.end = adjustTimezoneOffset(new Date('2017-02-06T09:00:00'));
      expect(standardShift.isMorningShift()).to.be.false;
    });
  });

  context('isDayBefore', () => {
    it('returns true when this shift is a day before', () => {
      const dayBeforeStandardShift = new Shift({
        type: shiftTypes.standard,
        start: adjustTimezoneOffset(new Date('2017-02-05T09:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-05T10:00:00')),
      });
      expect(dayBeforeStandardShift.isDayBefore(standardShift)).to.be.true;
    });
  });

  context('isAdjacent', () => {
    let night;
    let morning;
    let afterMorning;
    let notAdjacent;

    beforeEach(() => {
      night = new Shift({
        type: shiftTypes.standard,
        start: adjustTimezoneOffset(new Date('2017-02-06T18:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-06T20:00:00')),
      });
      morning = new Shift({
        type: shiftTypes.standard,
        start: adjustTimezoneOffset(new Date('2017-02-07T08:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-07T09:00:00')),
      });
      afterMorning = new Shift({
        type: shiftTypes.standard,
        start: adjustTimezoneOffset(new Date('2017-02-07T09:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-07T10:00:00')),
      });
      notAdjacent = new Shift({
        type: shiftTypes.standard,
        start: adjustTimezoneOffset(new Date('2017-02-07T12:00:00')),
        end: adjustTimezoneOffset(new Date('2017-02-07T13:00:00')),
      });
    });

    it('returns true when shift is adjacent', () => {
      expect(night.isAdjacent(morning)).to.be.true;
      expect(morning.isAdjacent(night)).to.be.true;
      expect(morning.isAdjacent(afterMorning)).to.be.true;
      expect(afterMorning.isAdjacent(morning)).to.be.true;
    });

    it('returns false when shift is not adjacent', () => {
      expect(night.isAdjacent(notAdjacent)).to.be.false;
      expect(morning.isAdjacent(notAdjacent)).to.be.false;
      expect(afterMorning.isAdjacent(notAdjacent)).to.be.false;
      expect(night.isAdjacent(afterMorning)).to.be.false;
    });
  });

  context('initialise', () => {
    const loadEmployeeStub = (func, returnVal) => {
      const employeeStub = {
        worksDuringShift: () => true,
        onLeaveDuringShift: () => false,
        negDuringShift: () => false,
        workingShiftAtSameTime: () => false,
      };
      employeeStub[func] = () => returnVal;
      return employeeStub;
    };

    it('initialises the employee lists correctly', () => {
      const onLeaveEmployee = loadEmployeeStub('onLeaveDuringShift', true);
      const negEmployee = loadEmployeeStub('negDuringShift', true);
      const sameTimeEmployee = loadEmployeeStub('workingShiftAtSameTime', true);
      const notWorkingEmployee = loadEmployeeStub('worksDuringShift', false);
      const allEmployees = [onLeaveEmployee, negEmployee, sameTimeEmployee, notWorkingEmployee];

      aalShift1.initialise(allEmployees);
      expect(aalShift1.onLeaveEmployees).to.eql([onLeaveEmployee]);
      expect(aalShift1.negEmployees).to.eql([negEmployee]);
      expect(aalShift1.workingShiftAtSameTimeEmployees).to.eql([sameTimeEmployee]);
    });
  });
});
