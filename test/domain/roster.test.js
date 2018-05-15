'use strict';

const chai = require('chai');
const Roster = require('../../src/domain/roster');
const { Shift } = require('../../src/domain/shift');
const Employee = require('../../src/domain/employee');
const hewLevels = require('../../src/domain/hew-level');
const { shiftTypes } = require('../../src/domain/shift-type');

const { expect } = chai;

describe('Roster', () => {
  let roster;
  let expectedSortedShifts;

  beforeEach(() => {
    const startDay1 = new Date('2017-02-06T08:00:00');
    const endDay1 = new Date('2017-02-06T09:00:00');
    const startDay2 = new Date('2017-02-07T08:00:00');
    const endDay2 = new Date('2017-02-07T09:00:00');

    const employee1 = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel4 });
    const employee2 = new Employee({ name: 'empy', hewLevel: hewLevels.hewLevel4 });

    const backupShift = new Shift({ types: [shiftTypes.backup], start: startDay1, end: endDay1 });

    const aal2AvailableShift = new Shift({ types: [shiftTypes.aal], start: startDay1, end: endDay1 });
    aal2AvailableShift.addAvailableEmployee(employee1);
    aal2AvailableShift.addAvailableEmployee(employee2);

    const standard1AvailableShift = new Shift({ types: [shiftTypes.standard], start: startDay2, end: endDay2 });
    standard1AvailableShift.addAvailableEmployee(employee1);

    const ro1AvailableShift = new Shift({ types: [shiftTypes.responsibleOfficer], start: startDay2, end: endDay2 });
    ro1AvailableShift.addAvailableEmployee(employee1);

    const aalNoneAvailableShift = new Shift({ types: [shiftTypes.aal], start: startDay2, end: endDay2 });

    const shifts = [backupShift, aal2AvailableShift, standard1AvailableShift, ro1AvailableShift, aalNoneAvailableShift];
    expectedSortedShifts = Array.from(shifts).reverse();
    roster = new Roster({ shifts, employees: {} });
  });

  context('shiftsByDays', () => {
    it('organises shifts by days', () => {
      expect(roster.shiftsByDays.length).to.be.equal(2);
      expect(roster.shiftsByDays[0].shifts.length).to.be.equal(2);
      expect(roster.shiftsByDays[0].header).to.be.equal('Monday, 6th February 2017 - Pay Week');
    });
  });

  context('sort', () => {
    it('sorts correctly based on type', () => {
      const sortedShifts = roster.sortShifts();
      expect(sortedShifts).to.be.eql(expectedSortedShifts);
    });
  });

  context('asICal', () => {
    it('creates correct iCal output', () => {
      const expected = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20170206T080000
DTEND:20170206T090000
SUMMARY:None Found : Backup
END:VEVENT
BEGIN:VEVENT
DTSTART:20170206T080000
DTEND:20170206T090000
SUMMARY:empy : AAL
END:VEVENT
BEGIN:VEVENT
DTSTART:20170207T080000
DTEND:20170207T090000
SUMMARY:empy : Standard
END:VEVENT
BEGIN:VEVENT
DTSTART:20170207T080000
DTEND:20170207T090000
SUMMARY:empy : ResponsibleOfficer
END:VEVENT
BEGIN:VEVENT
DTSTART:20170207T080000
DTEND:20170207T090000
SUMMARY:None Found : AAL
END:VEVENT
END:VCALENDAR`;
      roster.fillShifts();
      expect(roster.asICal()).to.eql(expected);
    });
  });
});
