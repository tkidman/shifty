'use strict';
const chai = require('chai');
const expect = chai.expect;
const shifty = require('../src/shifty');
const parsers = shifty.parsers;
const hewLevels = require('../src/domain/hew-level');
const adjustTimezoneOffset = require('../src/common').adjustTimezoneOffset;
const { shiftTypesList, shiftTypes } = require('../src/domain/shift-type');

context('parsers', () => {
  it('hew level parser returns hew level for valid hew level', () => {
    expect(parsers.hewLevelParser({ value: 8 }).value).to.equal(hewLevels.hewLevel8);
    expect(parsers.hewLevelParser({ value: ' 5 ' }).value).to.equal(hewLevels.hewLevel5);
  });

  it('hew level parser generates error for invalid hew level', () => {
    expect(parsers.hewLevelParser({ value: 100 }).error).to.equal('Unable to find hew level for value: 100');
  });

  it('true false parser generates true for yes', () => {
    expect(parsers.trueFalseParser({ value: 'yes' }).value).to.equal(true);
  });

  it('true false parser generates false for FalSE ', () => {
    expect(parsers.trueFalseParser({ value: ' FalSE ' }).value).to.equal(false);
  });

  it('true false parser generates error for abc', () => {
    expect(parsers.trueFalseParser({ value: 'abc' }).error).to.equal('Unable to determine true or false from value: abc');
  });

  it('true false parser generates error for empty value', () => {
    expect(parsers.trueFalseParser({ value: null }).error).to.equal('No value provided');
  });

  it('number parser return number for valid string number', () => {
    expect(parsers.numberParser({ value: '34' }).value).to.equal(34);
  });

  it('number parser return number for valid string number with whitespace', () => {
    expect(parsers.numberParser({ value: ' 34  ' }).value).to.equal(34);
  });

  it('number parser return number for valid number', () => {
    expect(parsers.numberParser({ value: 34 }).value).to.equal(34);
  });

  it('number parser return number for zero', () => {
    expect(parsers.numberParser({ value: 0 }).value).to.equal(0);
  });

  it('number parser returns error for invalid string', () => {
    expect(parsers.numberParser({ value: 'abc' }).error).to.equal('abc is not a number');
  });

  it('number parser returns error for string with only whitespace', () => {
    expect(parsers.numberParser({ value: ' ' }).error).to.equal('  is not a number');
  });

  it('number parser returns error for null value', () => {
    expect(parsers.numberParser({ value: null }).error).to.equal('null is not a number');
  });

  it('date parser returns date for valid date', () => {
    const date = new Date();
    expect(parsers.dateParser({ value: date }).value).to.eql(adjustTimezoneOffset(date));
  });

  it('date parser returns error for invalid date', () => {
    expect(parsers.dateParser({ value: 'abc' }).error).to.equal('abc is not a date');
  });

  it('shiftType parser returns shiftType for valid shiftType', () => {
    expect(parsers.shiftTypeParser({ value: ' AAL  ' }).value).to.eql([shiftTypes.aal]);
  });

  it('shiftType parser returns shiftTypes for valid shiftTypes', () => {
    expect(parsers.shiftTypeParser({ value: ' AAL,SLC  ' }).value).to.eql([shiftTypes.aal, shiftTypes.slc]);
  });

  it('shiftType parser returns error for invalid shiftType', () => {
    expect(parsers.shiftTypeParser({ value: 'abc' }).error).to.equal(
      `abc is not a valid shift type. Allowed values: ${shiftTypesList}`
    );
  });

  it('shiftType parser returns error for invalid shiftTypes', () => {
    expect(parsers.shiftTypeParser({ value: 'abc,AAL,def' }).error).to.equal(
      `abc, def are not valid shift types. Allowed values: ${shiftTypesList}`
    );
  });
});
