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

    describe('when called with an HDT file as argument', function () {
      describe('with pattern none none none', function () {
        it('should return an array with matches', function () {
          var triples = hdt.search('./test/test.hdt');
          triples.should.be.an.Array;
          triples.should.have.lengthOf(10);
          triples[0].should.eql({ subject:   'http://example.org/uri3',
                                  predicate: 'http://example.org/predicate3',
                                  object:    'http://example.org/uri4' });
        });
      });

      describe('with pattern ex:uri3 none none', function () {
        it('should return an array with matches', function () {
          var triples = hdt.search('./test/test.hdt', 'http://example.org/uri3');
          triples.should.be.an.Array;
          triples.should.have.lengthOf(2);
          triples[0].should.eql({ subject:   'http://example.org/uri3',
                                  predicate: 'http://example.org/predicate3',
                                  object:    'http://example.org/uri4' });
          triples[1].should.eql({ subject:   'http://example.org/uri3',
                                  predicate: 'http://example.org/predicate3',
                                  object:    'http://example.org/uri5' });
        });
      });

      describe('with pattern ex:uri3 null null', function () {
        it('should return an array with matches', function () {
          var triples = hdt.search('./test/test.hdt', 'http://example.org/uri3', null, null);
          triples.should.be.an.Array;
          triples.should.have.lengthOf(2);
          triples[0].should.eql({ subject:   'http://example.org/uri3',
                                  predicate: 'http://example.org/predicate3',
                                  object:    'http://example.org/uri4' });
          triples[1].should.eql({ subject:   'http://example.org/uri3',
                                  predicate: 'http://example.org/predicate3',
                                  object:    'http://example.org/uri5' });
        });
      });

      describe('with pattern null ex:predicate3 null', function () {
        it('should return an array with matches', function () {
          var triples = hdt.search('./test/test.hdt', null, 'http://example.org/predicate3', null);
          triples.should.be.an.Array;
          triples.should.have.lengthOf(2);
          triples[0].should.eql({ subject:   'http://example.org/uri3',
                                  predicate: 'http://example.org/predicate3',
                                  object:    'http://example.org/uri4' });
          triples[1].should.eql({ subject:   'http://example.org/uri3',
                                  predicate: 'http://example.org/predicate3',
                                  object:    'http://example.org/uri5' });
        });
      });

      describe('with pattern null null ex:uri4', function () {
        it('should return an array with matches', function () {
          var triples = hdt.search('./test/test.hdt', null, null, 'http://example.org/uri4');
          triples.should.be.an.Array;
          triples.should.have.lengthOf(1);
          triples[0].should.eql({ subject:   'http://example.org/uri3',
                                  predicate: 'http://example.org/predicate3',
                                  object:    'http://example.org/uri4' });
        });
      });
    });
  });
});
