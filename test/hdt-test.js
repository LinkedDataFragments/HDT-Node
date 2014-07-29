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

  describe('search', function () {
    describe('when called without arguments', function () {
      it('should throw an error', function () {
        (function () { hdt.search() })
        .should.throw('search should receive a string as first argument.');
      });
    });

    describe('when called with a non-string argument', function () {
      it('should throw an error', function () {
        (function () { hdt.search(null) })
        .should.throw('search should receive a string as first argument.');
      });
    });

    describe('when called with a non-existing file as argument', function () {
      it('should throw an error', function () {
        (function () { hdt.search('abc') })
        .should.throw('Error opening HDT file for mapping.');
      });
    });

    describe('when called with a non-HDT file as argument', function () {
      it('should throw an error', function () {
        (function () { hdt.search('./test/hdt-test.js') })
        .should.throw('Non-HDT Section');
      });
    });
  });
});
