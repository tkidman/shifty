'use strict';
const chai = require('chai');
const expect = chai.expect;
const common = require('../src/common');

describe('common', () => {
  it('formats a date', () => {
    const date = common.adjustTimezoneOffset(new Date('2017-02-06T08:00:00'));
    expect(common.dateString(date)).to.eql('6/2/2017 08:00');
  });
});
