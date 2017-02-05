'use strict';
const chai = require('chai');
const expect = chai.expect;
const shifty = require('../src/shifty');

describe('Shifty', () => {

  beforeEach(() => {
    return shifty.run();
  });

  context('runs', () => {
    it('can run', () => {
      expect(true).to.be.true;
    });
  });
});
