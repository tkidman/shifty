'use strict';

const chai = require('chai');
const common = require('../src/common');

const { expect } = chai;

describe('common', () => {
  it('formats a date', () => {
    const date = new Date('2017-02-06T08:00:00');
    expect(common.dateString(date)).to.eql('6/2/2017 08:00');
  });

  it('formats a date to digits in localtime', () => {
    const date = new Date('2017-02-06T08:00:00');
    expect(common.dateTimeDigitsLocal(date)).to.eql('20170206T080000');
  });

  it('returns true when dates are on the same day', () => {
    const date1 = new Date('2017-02-06T08:00:00');
    const date2 = new Date('2017-02-06T23:00:00');
    expect(common.sameDay(date1, date2)).to.be.true;
  });

  it('returns false when dates are not on the same day', () => {
    const date1 = new Date('2017-02-06T08:00:00');
    const date2 = new Date('2017-02-07T00:00:00');
    expect(common.sameDay(date1, date2)).to.be.false;
  });

  context('isNullOrWhitespace', () => {
    const nullOrWhiteSpaceValues = ['', null, undefined, '  ', '\t', ' '];
    nullOrWhiteSpaceValues.forEach((value) => {
      it(`returns true for value '${value}'`, () => {
        expect(common.isNullOrWhitespace(value)).to.be.true;
      });
    });

    const nonNullOrWhiteSpaceValues = ['a', new Date(), 2, 0, false, '0 '];
    nonNullOrWhiteSpaceValues.forEach((value) => {
      it(`returns false for value '${value}'`, () => {
        expect(common.isNullOrWhitespace(value)).to.be.false;
      });
    });
  });

  context('isInPayweek', () => {
    const payweekDates = [
      new Date('2017-03-13T00:00:00'),
      new Date('2017-03-19T23:59:59'),
      new Date('2017-03-28T09:00:00'),
      new Date('2017-04-12T09:00:00'),
    ];
    const nonPayweekDates = [
      new Date('2017-03-26T23:59:59'),
      new Date('2017-03-20T00:00:00'),
      new Date('2017-04-04T09:00:00'),
      new Date('2017-04-19T09:00:00'),
    ];
    payweekDates.forEach((payweekDate) => {
      it(`returns true when date is ${payweekDate}`, () => {
        expect(common.isInPayweek(payweekDate)).to.be.true;
      });
    });

    nonPayweekDates.forEach((nonPayweekDate) => {
      it(`returns false when date is ${nonPayweekDate}`, () => {
        expect(common.isInPayweek(nonPayweekDate)).to.be.false;
      });
    });
  });

  context('formatNumber', () => {
    const tests = {
      100: '100',
      1.336: '1.34',
      10000.111: '10000.11',
    };

    Object.keys(tests).forEach((key) => {
      it(`displays ${tests[key]} when formatting ${key}`, () => {
        expect(common.formatNumber(key)).to.equal(tests[key]);
      });
    });

    it('works with NaN', () => {
      expect(common.formatNumber(10 / 0)).to.equal('NaN');
    });
  });
});
