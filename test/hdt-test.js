var should = require('should');

var hdt = require('../build/Release/hdt');

describe('hdt', function () {
  describe('The hdt module', function () {
    it('should be an object', function () {
      hdt.should.be.an.Object;
    });

    it('should have the correct version', function () {
      hdt.version.should.equal('HDT native');
    });
  });
});
