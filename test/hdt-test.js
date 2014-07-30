require('should');

var hdt = require('../hdt');

describe('hdt', function () {
  describe('The hdt module', function () {
    it('should be an object', function () {
      hdt.should.be.an.Object;
    });
  });

  describe('creating a new HDT document with fromFile', function () {
    describe('without arguments', function () {
      it('should throw an error', function () {
        (function () { hdt.fromFile(); })
        .should.throw('Invalid filename: undefined');
      });
    });

    describe('with a non-string argument', function () {
      it('should throw an error', function () {
        (function () { hdt.fromFile(5); })
        .should.throw('Invalid filename: 5');
      });
    });

    describe('with a non-existing file as argument', function () {
      it('should throw an error', function () {
        (function () { hdt.fromFile('abc'); })
        .should.throw('Could not open HDT file "abc"');
      });
    });

    describe('with a non-HDT file as argument', function () {
      it('should throw an error', function () {
        (function () { hdt.fromFile('./test/hdt-test.js'); })
        .should.throw('The file "./test/hdt-test.js" is not a valid HDT file');
      });
    });
  });

  describe('calling search', function () {
    describe('on an HDT document for an example HDT file', function () {
      var document = hdt.fromFile('./test/test.hdt');

      describe('with pattern null null null', function () {
        it('should return an array with matches', function (done) {
          document.search(null, null, null, function (error, triples) {
            triples.should.be.an.Array;
            triples.should.have.lengthOf(10);
            triples[0].should.eql({ subject:   'http://example.org/uri3',
                                    predicate: 'http://example.org/predicate3',
                                    object:    'http://example.org/uri4' });
            done(error);
          });
        });
      });

      describe('with pattern ex:uri3 null null', function () {
        it('should return an array with matches', function (done) {
          document.search('http://example.org/uri3', null, null, function (error, triples) {
            triples.should.be.an.Array;
            triples.should.have.lengthOf(2);
            triples[0].should.eql({ subject:   'http://example.org/uri3',
                                    predicate: 'http://example.org/predicate3',
                                    object:    'http://example.org/uri4' });
            triples[1].should.eql({ subject:   'http://example.org/uri3',
                                    predicate: 'http://example.org/predicate3',
                                    object:    'http://example.org/uri5' });
            done(error);
          });
        });
      });

      describe('with pattern null ex:predicate3 null', function () {
        it('should return an array with matches', function (done) {
          document.search(null, 'http://example.org/predicate3', null, function (error, triples) {
            triples.should.be.an.Array;
            triples.should.have.lengthOf(2);
            triples[0].should.eql({ subject:   'http://example.org/uri3',
                                    predicate: 'http://example.org/predicate3',
                                    object:    'http://example.org/uri4' });
            triples[1].should.eql({ subject:   'http://example.org/uri3',
                                    predicate: 'http://example.org/predicate3',
                                    object:    'http://example.org/uri5' });
            done(error);
          });
        });
      });

      describe('with pattern null null ex:uri4', function () {
        it('should return an array with matches', function (done) {
          document.search(null, null, 'http://example.org/uri4', function (error, triples) {
            triples.should.be.an.Array;
            triples.should.have.lengthOf(1);
            triples[0].should.eql({ subject:   'http://example.org/uri3',
                                    predicate: 'http://example.org/predicate3',
                                    object:    'http://example.org/uri4' });
            done(error);
          });
        });
      });
    });
  });
});
