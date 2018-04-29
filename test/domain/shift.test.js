'use strict';
const chai = require('chai');
const expect = chai.expect;
const Employee = require('../../src/domain/employee');
const Shift = require('../../src/domain/shift').Shift;
const scoreConstants = require('../../src/domain/shift').scoreConstants;
const unavailabilityTypes = require('../../src/domain/unavailability').unavailabilityTypes;
const Unavailability = require('../../src/domain/unavailability').Unavailability;
const shiftTypes = require('../../src/domain/shift-type').shiftTypes;
const ShiftAllocation = require('../../src/domain/shift-allocation');
const hewLevels = require('../../src/domain/hew-level');

describe('Shift', () => {
  let employee;
  let employee2;
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
      types: [shiftTypes.standard],
      start: new Date('2017-02-06T09:00:00'),
      end: new Date('2017-02-06T10:00:00'),
    });
    aalShift1 = new Shift({
      types: [shiftTypes.aal],
      start: new Date('2017-02-06T11:00:00'),
      end: new Date('2017-02-06T12:00:00'),
      label: 'Carlton swap',
    });
    aalShift2 = new Shift({
      types: [shiftTypes.aal],
      start: new Date('2017-02-06T13:00:00'),
      end: new Date('2017-02-06T15:00:00'),
    });
    nightShift = new Shift({
      types: [shiftTypes.standard],
      start: new Date('2017-02-06T17:00:00'),
      end: new Date('2017-02-06T21:00:00'),
    });
    standardShiftTypes = [shiftTypes.aal, shiftTypes.standard, shiftTypes.backup];
    employee = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel5, hoursByDayOfWeek, shiftTypes: standardShiftTypes });
    employee.idealMinMinutes = 300;
    employee.idealMaxMinutes = 600;
    employee.markAsAvailableForShift(standardShift);
    employee2 = new Employee({ name: 'ompy', hewLevel: hewLevels.hewLevel5, hoursByDayOfWeek, shiftTypes: standardShiftTypes });
  });

  context('scoreEmployee', () => {
    it('returns the correct score when under minimum minutes', () => {
      const empScore = standardShift.getPotentialShiftAllocation(employee);
      const expectedScore = standardShift.getShiftLengthMinutes() - employee.idealMinMinutes + scoreConstants.minMinutesScoreChange;
      expect(empScore.score).to.eql(expectedScore);
    });

    it('returns the correct score when over minimum minutes and under ideal minutes', () => {
      const nextDayShift = new Shift({
        types: [shiftTypes.standard],
        start: new Date('2017-02-07T09:00:00'),
        end: new Date('2017-02-07T10:00:00'),
      });
      nightShift.allocateShift(new ShiftAllocation(nightShift, employee));
      const score = nextDayShift.getPotentialShiftAllocation(employee);
      const expectedScore = nightShift.getShiftLengthMinutes() + nextDayShift.getShiftLengthMinutes() - employee.idealMinMinutes;
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
        start: new Date('2017-02-06T17:00:00'),
        end: new Date('2017-02-06T21:00:00'),
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
      aalShift1.fill();
      expect(aalShift1.shiftAllocation.warningsList.length).to.eql(1);
      expect(aalShift1.shiftAllocation.warningsList[0]).to.equal('Nobody was found to work this shift');
    });
  });

  context('allocateShift', () => {
    let sameTimeShift;
    beforeEach(() => {
      sameTimeShift = new Shift({
        type: shiftTypes.aal,
        start: new Date('2017-02-06T09:00:00'),
        end: new Date('2017-02-06T10:00:00'),
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
      standardShift.end = new Date('2017-02-06T18:31:00');
      expect(standardShift.isNightShift()).to.be.true;
    });

    it('is not a night shift when it ends before 6:30pm', () => {
      standardShift.end = new Date('2017-02-06T18:29:00');
      expect(standardShift.isNightShift()).to.be.false;
    });
  });

  context('isMorningShift', () => {
    it('is a morning shift when it starts before 9:00am', () => {
      standardShift.start = new Date('2017-02-06T08:55:00');
      expect(standardShift.isMorningShift()).to.be.true;
    });

    it('is not a morning shift when it starts after 9:00am', () => {
      standardShift.end = new Date('2017-02-06T09:00:00');
      expect(standardShift.isMorningShift()).to.be.false;
    });
  });

  context('isDayBefore', () => {
    it('returns true when this shift is a day before', () => {
      const dayBeforeStandardShift = new Shift({
        type: shiftTypes.standard,
        start: new Date('2017-02-05T09:00:00'),
        end: new Date('2017-02-05T10:00:00'),
      });
      expect(dayBeforeStandardShift.isDayBefore(standardShift)).to.be.true;
    });
  });

  context('isAdjacent', () => {
    let night;
    let morning;
    let afterMorning;
    let notAdjacent;
    let morningOfNight;

    beforeEach(() => {
      night = new Shift({
        type: shiftTypes.standard,
        start: new Date('2017-02-06T18:00:00'),
        end: new Date('2017-02-06T20:00:00'),
      });
      morning = new Shift({
        type: shiftTypes.standard,
        start: new Date('2017-02-07T08:00:00'),
        end: new Date('2017-02-07T09:00:00'),
      });
      afterMorning = new Shift({
        type: shiftTypes.standard,
        start: new Date('2017-02-07T09:00:00'),
        end: new Date('2017-02-07T10:00:00'),
      });
      notAdjacent = new Shift({
        type: shiftTypes.standard,
        start: new Date('2017-02-07T12:00:00'),
        end: new Date('2017-02-07T13:00:00'),
      });
      morningOfNight = new Shift({
        type: shiftTypes.standard,
        start: new Date('2017-02-06T09:00:00'),
        end: new Date('2017-02-06T10:00:00'),
      });
    });

    it('returns true when shift is adjacent', () => {
      expect(night.isAdjacent(morning)).to.be.true;
      expect(morning.isAdjacent(night)).to.be.true;
      expect(morning.isAdjacent(afterMorning)).to.be.true;
      expect(afterMorning.isAdjacent(morning)).to.be.true;
      expect(night.isAdjacent(morningOfNight)).to.be.true;
      expect(morningOfNight.isAdjacent(night)).to.be.true;
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
        available: false,
        worksDuringShift: () => true,
        findUnavailabilityDuringShift: () => undefined,
        workingShiftAtSameTime: () => false,
        name: 'empy',
        shiftTypes: [shiftTypes.aal],
        markAsAvailableForShift: (shift) => {
          shift.addAvailableEmployee(this);
        },
      };
      employeeStub[func] = () => returnVal;
      return employeeStub;
    };

    const neg = new Unavailability({
      start: new Date('2017-02-07T12:00:00'),
      end: new Date('2017-02-07T13:00:00'),
      type: unavailabilityTypes.neg,
      reason: 'I need it!',
    });
    const leave = new Unavailability({
      start: new Date('2017-02-07T12:00:00'),
      end: new Date('2017-02-07T13:00:00'),
      type: unavailabilityTypes.leave,
      reason: 'Holiday!',
    });
    const onLeaveEmployee = loadEmployeeStub('findUnavailabilityDuringShift', leave);
    const negEmployee = loadEmployeeStub('findUnavailabilityDuringShift', neg);
    const missingShiftTypeEmployee = loadEmployeeStub();
    missingShiftTypeEmployee.shiftTypes = [shiftTypes.reference];
    const sameTimeEmployee = loadEmployeeStub('workingShiftAtSameTime', true);
    const notWorkingEmployee = loadEmployeeStub('worksDuringShift', false);
    const availableEmployee = loadEmployeeStub();
    const allEmployees = [
      onLeaveEmployee, negEmployee, sameTimeEmployee, notWorkingEmployee, missingShiftTypeEmployee, availableEmployee,
    ];

    it('initialises the employee lists correctly', () => {
      aalShift1.initialise(allEmployees);
      expect(aalShift1.unavailableEmployees).to.eql([onLeaveEmployee, negEmployee]);
      expect(aalShift1.workingShiftAtSameTimeEmployees).to.eql([sameTimeEmployee]);
      expect(aalShift1.missingShiftTypeEmployees).to.eql([missingShiftTypeEmployee]);
      expect(aalShift1.availableEmployees.length).to.eql(1);
    });

    it('produces a nicely formatted list of employee leave', () => {
      aalShift1.initialise(allEmployees);
      expect(aalShift1.employeeLeaveDisplay()).to.eql(['empy : 7/2/2017 - 7/2/2017 : Holiday!']);
    });

    it('produces a nicely formatted list of employee negs', () => {
      aalShift1.initialise(allEmployees);
      expect(aalShift1.employeeNegsDisplay()).to.eql(['empy : 12:00 - 13:00 : I need it!']);
    });

    it('produces a nicely formatted list of employees with missing shift types', () => {
      aalShift1.initialise(allEmployees);
      expect(aalShift1.employeeMissingShiftTypesDisplay()).to.eql(['empy']);
    });
  });

  context('employeeNames', () => {
    it('produces a nicely formatted string of employee names', () => {
      expect(standardShift.employeeNames([employee, employee2])).to.eql('empy, ompy');
      expect(standardShift.employeeNames([employee])).to.eql('empy');
      expect(standardShift.employeeNames([])).to.eql('');
    });
  });

  context('worseAllocationsDisplayList', () => {
    const employeeMessage = 'empy (warning the first, warning the second)';
    const employee2Message = 'ompy (warning the first)';

    beforeEach(() => {
      standardShift.getSortedPotentialShiftAllocations = () => ([
        new ShiftAllocation(standardShift, employee, ['warning the first', 'warning the second']),
        new ShiftAllocation(standardShift, employee2, ['warning the first']),
      ]);
      standardShift.shiftAllocation = new ShiftAllocation(standardShift);
    });

    it('produces a list of nicely formatted worse allocations', () => {
      expect(standardShift.worseAllocationsDisplayList()).to.eql([employeeMessage, employee2Message]);
    });

    it('does not include actual allocation in the list', () => {
      standardShift.shiftAllocation.employee = employee;
      expect(standardShift.worseAllocationsDisplayList()).to.eql([employee2Message]);
    });
  });

  context('isOnlyShiftType', () => {
    it('returns true when shift only contains the shift type', () => {
      expect(nightShift.isOnlyShiftType(shiftTypes.standard)).to.be.true;
    });

    it('returns false when shift has more than 1 shift type', () => {
      nightShift.types.push(shiftTypes.aal);
      expect(nightShift.isOnlyShiftType(shiftTypes.standard)).to.be.false;
    });

    it('returns false when shift has 1 shift type of the wrong type', () => {
      expect(aalShift1.isOnlyShiftType(shiftTypes.standard)).to.be.false;
    });
  });

  context('hasAnyEmployeeShiftTypes', () => {
    it('returns true when the employee has one of the shift\'s shift types', () => {
      expect(standardShift.hasAnyEmployeeShiftTypes(employee)).to.be.true;
      standardShift.types.push(shiftTypes.bEast);
      expect(standardShift.hasAnyEmployeeShiftTypes(employee)).to.be.true;
    });

    it('returns false when the employee has none of the shift\'s shift types', () => {
      standardShift.types = [shiftTypes.bEast, shiftTypes.slc];
      expect(standardShift.hasAnyEmployeeShiftTypes(employee)).to.be.false;
    });
  });
});
