'use strict';
const chai = require('chai');
const expect = chai.expect;
const common = require('../src/common');

describe('common', () => {
  it('formats a date', () => {
    const date = common.adjustTimezoneOffset(new Date('2017-02-06T08:00:00'));
    expect(common.dateString(date)).to.eql('6/2/2017 08:00');
  });

  it('returns true when dates are on the same day', () => {
    const date1 = common.adjustTimezoneOffset(new Date('2017-02-06T08:00:00'));
    const date2 = common.adjustTimezoneOffset(new Date('2017-02-06T23:00:00'));
    expect(common.sameDay(date1, date2)).to.be.true;
  });

  it('returns false when dates are not on the same day', () => {
    const date1 = common.adjustTimezoneOffset(new Date('2017-02-06T08:00:00'));
    const date2 = common.adjustTimezoneOffset(new Date('2017-02-07T00:00:00'));
    expect(common.sameDay(date1, date2)).to.be.false;
  });

  context('isNullOrWhitespace', () => {
    const nullOrWhiteSpaceValues = ['', null, undefined, '  ', '\t', ' '];
    nullOrWhiteSpaceValues.forEach(value => {
      it(`returns true for value '${value}'`, () => {
        expect(common.isNullOrWhitespace(value)).to.be.true;
      });
    });

    const nonNullOrWhiteSpaceValues = ['a', new Date(), 2];
    nonNullOrWhiteSpaceValues.forEach(value => {
      it(`returns false for value '${value}'`, () => {
        expect(common.isNullOrWhitespace(value)).to.be.false;
      });
    });
  });
});
