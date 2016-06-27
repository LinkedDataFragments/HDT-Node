require('should');

var hdt = require('../lib/hdt');

describe('hdt', function () {
  describe('The hdt module', function () {
    it('should be an object', function () {
      hdt.should.be.an.Object;
    });
  });

  describe('creating a new HDT document with fromFile', function () {
    describe('with a non-string argument', function () {
      it('should throw an error', function (done) {
        var self = {};
        hdt.fromFile(null, function (error) {
          this.should.equal(self);
          error.should.be.an.Error;
          error.message.should.equal('Invalid filename: null');
          done();
        }, self);
      });
    });

    describe('with a non-existing file as argument', function () {
      it('should throw an error', function (done) {
        var self = {};
        hdt.fromFile('abc', function (error) {
          this.should.equal(self);
          error.should.be.an.Error;
          error.message.should.equal('Could not open HDT file "abc"');
          done();
        }, self);
      });
    });

    describe('with a non-HDT file as argument', function () {
      it('should throw an error', function (done) {
        var self = {};
        hdt.fromFile('./test/hdt-test.js', function (error) {
          this.should.equal(self);
          error.should.be.an.Error;
          error.message.should.equal('The file "./test/hdt-test.js" is not a valid HDT file');
          done();
        }, self);
      });
    });

    describe('without self value', function () {
      it('should invoke the callback with `global` as `this`', function (done) {
        hdt.fromFile('./test/test.hdt', function (error, hdtDocument) {
          this.should.equal(global);
          hdtDocument.close();
          done(error);
        });
      });
    });

    describe('with a self value', function () {
      it('should invoke the callback with that value as `this`', function (done) {
        var self = {};
        hdt.fromFile('./test/test.hdt', function (error, hdtDocument) {
          this.should.equal(self);
          hdtDocument.close();
          done(error);
        }, self);
      });
    });
  });

  describe('An HDT document for an example HDT file', function () {
    var document;
    before(function (done) {
      hdt.fromFile('./test/test.hdt', function (error, hdtDocument) {
        document = hdtDocument;
        done(error);
      });
    });
    after(function (done) {
      document.close(done);
    });

    describe('asked for supported features', function () {
      it('should return an object', function () {
        document.features.should.be.an.instanceof(Object);
      });

      it('should support searchTriples', function () {
        document.features.searchTriples.should.be.true;
      });

      it('should support countTriples', function () {
        document.features.countTriples.should.be.true;
      });

      it('should not support searchLiterals', function () {
        document.features.searchLiterals.should.be.false;
      });
    });

    describe('being searched', function () {
      describe('without self value', function () {
        it('should invoke the callback with the HDT document as `this`', function (done) {
          document.searchTriples('a', 'b', 'c', function (error) {
            this.should.equal(document);
            done(error);
          });
        });
      });

      describe('with a self value', function () {
        var self = {};
        it('should invoke the callback with that value as `this`', function (done) {
          document.searchTriples('a', 'b', 'c', function (error) {
            this.should.equal(self);
            done(error);
          }, self);
        });
      });

      describe('with a non-existing pattern', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples('a', null, null,
            function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array;
          triples.should.be.empty;
        });

        it('should estimate the total count as 0', function () {
          totalCount.should.equal(0);
        });
      });

      describe('with pattern null null null', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples(null, null, null,
            function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array;
          triples.should.have.lengthOf(132);
          triples[0].should.eql({ subject:   'http://example.org/s1',
                                  predicate: 'http://example.org/p1',
                                  object:    'http://example.org/o001' });
        });

        it('should estimate the total count as 132', function () {
          totalCount.should.equal(132);
        });
      });

      describe('with pattern null null null, offset 0 and limit 10', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples(null, null, null, { offset: 0, limit: 10 },
            function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array;
          triples.should.have.lengthOf(10);
          triples[0].should.eql({ subject:   'http://example.org/s1',
                                  predicate: 'http://example.org/p1',
                                  object:    'http://example.org/o001' });
        });

        it('should estimate the total count as 132', function () {
          totalCount.should.equal(132);
        });
      });

      describe('with pattern null null null, offset 10 and limit 5', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples(null, null, null, { offset: 10, limit: 5 },
            function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array;
          triples.should.have.lengthOf(5);
          triples[0].should.eql({ subject:   'http://example.org/s1',
                                  predicate: 'http://example.org/p1',
                                  object:    'http://example.org/o011' });
        });

        it('should estimate the total count as 132', function () {
          totalCount.should.equal(132);
        });
      });

      describe('with pattern null null null, offset 200 and limit 5', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples(null, null, null, { offset: 200, limit: 5 },
            function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array;
          triples.should.be.empty;
        });

        it('should estimate the total count as 132', function () {
          totalCount.should.equal(132);
        });
      });

      describe('with pattern ex:s2 null null', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples('http://example.org/s2', null, null,
                          function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array;
          triples.should.have.lengthOf(10);
          triples[0].should.eql({ subject:   'http://example.org/s2',
                                  predicate: 'http://example.org/p1',
                                  object:    'http://example.org/o001' });
          triples[1].should.eql({ subject:   'http://example.org/s2',
                                  predicate: 'http://example.org/p1',
                                  object:    'http://example.org/o002' });
        });

        it('should estimate the total count as 10', function () {
          totalCount.should.equal(10);
        });
      });

      describe('with pattern ex:s2 null null, offset 2 and limit 1', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples('http://example.org/s2', null, null, { offset: 2, limit: 1 },
            function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array;
          triples.should.have.lengthOf(1);
          triples[0].should.eql({ subject:   'http://example.org/s2',
                                  predicate: 'http://example.org/p1',
                                  object:    'http://example.org/o003' });
        });

        it('should estimate the total count as 10', function () {
          totalCount.should.equal(10);
        });
      });

      describe('with pattern ex:s2 null null, offset 200 and limit 1', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples('http://example.org/s2', null, null, { offset: 200, limit: 1 },
            function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array;
          triples.should.be.empty;
        });

        it('should estimate the total count as 10', function () {
          totalCount.should.equal(10);
        });
      });

      describe('with pattern ex:s2 ?p ?o', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples('http://example.org/s2', '?p', '?o',
            function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array;
          triples.should.have.lengthOf(10);
          triples[0].should.eql({ subject:   'http://example.org/s2',
                                  predicate: 'http://example.org/p1',
                                  object:    'http://example.org/o001' });
          triples[1].should.eql({ subject:   'http://example.org/s2',
                                  predicate: 'http://example.org/p1',
                                  object:    'http://example.org/o002' });
        });

        it('should estimate the total count as 10', function () {
          totalCount.should.equal(10);
        });
      });

      describe('with pattern null ex:p2 null', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples(null, 'http://example.org/p2', null,
            function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array;
          triples.should.have.lengthOf(10);
          triples[0].should.eql({ subject:   'http://example.org/s3',
                                  predicate: 'http://example.org/p2',
                                  object:    'http://example.org/o001' });
          triples[1].should.eql({ subject:   'http://example.org/s3',
                                  predicate: 'http://example.org/p2',
                                  object:    'http://example.org/o002' });
        });

        it('should estimate the total count as 10', function () {
          totalCount.should.equal(10);
        });
      });

      describe('with pattern null ex:p3 null', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples(null, 'http://example.org/p3', null,
            function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array;
          triples.should.have.lengthOf(12);
          triples[0].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '""' });
          triples[1].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '""@en' });
          triples[2].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '""^^http://example.org/literal' });
          triples[3].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '""^^http://www.w3.org/2001/XMLSchema#string' });
          triples[4].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '"a"' });
          triples[5].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '"a"@en' });
          triples[6].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '"a"^^http://example.org/literal' });
          triples[7].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '"a"^^http://www.w3.org/2001/XMLSchema#string' });
          triples[8].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '"a"b\'c\\\r\n\\"' });
          triples[9].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '"a"b\'c\\\r\n\\"@en' });
          triples[10].should.eql({ subject:   'http://example.org/s4',
                                   predicate: 'http://example.org/p3',
                                   object:    '"a"b\'c\\\r\n\\"^^http://example.org/literal' });
          triples[11].should.eql({ subject:   'http://example.org/s4',
                                   predicate: 'http://example.org/p3',
                                   object:    '"a"b\'c\\\r\n\\"^^http://www.w3.org/2001/XMLSchema#string' });
        });

        it('should estimate the total count as 12', function () {
          totalCount.should.equal(12);
        });
      });

      describe('with pattern null null "a"^^http://example.org/literal', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples(null, null, '"a"^^http://example.org/literal',
            function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array;
          triples.should.have.lengthOf(1);
          triples[0].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '"a"^^http://example.org/literal' });
        });

        it('should estimate the total count as 1', function () {
          totalCount.should.equal(1);
        });
      });

      describe('with pattern null null ex:o012', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples(null, null, 'http://example.org/o012',
            function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array;
          triples.should.have.lengthOf(1);
          triples[0].should.eql({ subject:   'http://example.org/s1',
                                  predicate: 'http://example.org/p1',
                                  object:    'http://example.org/o012' });
        });

        it('should estimate the total count as 1', function () {
          totalCount.should.equal(1);
        });
      });
    });

    describe('being counted', function () {
      describe('without self value', function () {
        it('should invoke the callback with the HDT document as `this`', function (done) {
          document.countTriples('a', 'b', 'c', function (error) {
            this.should.equal(document);
            done(error);
          });
        });
      });

      describe('with a self value', function () {
        var self = {};
        it('should invoke the callback with that value as `this`', function (done) {
          document.countTriples('a', 'b', 'c', function (error) {
            this.should.equal(self);
            done(error);
          }, self);
        });
      });

      describe('with a non-existing pattern', function () {
        var totalCount;
        before(function (done) {
          document.countTriples('a', null, null,
                                function (error, c) { totalCount = c; done(error); });
        });

        it('should return 0', function () {
          totalCount.should.equal(0);
        });
      });

      describe('with pattern null null null', function () {
        var totalCount;
        before(function (done) {
          document.countTriples(null, null, null,
                                function (error, c) { totalCount = c; done(error); });
        });

        it('should return 132', function () {
          totalCount.should.equal(132);
        });
      });

      describe('with pattern ex:s2 null null', function () {
        var totalCount;
        before(function (done) {
          document.countTriples('http://example.org/s2', null, null,
                                function (error, c) { totalCount = c; done(error); });
        });

        it('should return 10', function () {
          totalCount.should.equal(10);
        });
      });

      describe('with pattern null ex:p2 null', function () {
        var totalCount;
        before(function (done) {
          document.countTriples(null, 'http://example.org/p2', null,
                                function (error, c) { totalCount = c; done(error); });
        });

        it('should return 10', function () {
          totalCount.should.equal(10);
        });
      });

      describe('with pattern null ex:p3 null', function () {
        var totalCount;
        before(function (done) {
          document.countTriples(null, 'http://example.org/p3', null,
                                function (error, c) { totalCount = c; done(error); });
        });

        it('should return 12', function () {
          totalCount.should.equal(12);
        });
      });

      describe('with pattern null null ex:o012', function () {
        var totalCount;
        before(function (done) {
          document.countTriples(null, null, 'http://example.org/o012',
                                function (error, c) { totalCount = c; done(error); });
        });

        it('should return 1', function () {
          totalCount.should.equal(1);
        });
      });

      describe('with pattern null null "a"^^http://example.org/literal', function () {
        var totalCount;
        before(function (done) {
          document.countTriples(null, null, '"a"^^http://example.org/literal',
                                function (error, c) { totalCount = c; done(error); });
        });

        it('should return 1', function () {
          totalCount.should.equal(1);
        });
      });
    });

    describe('being closed', function () {
      var self = {}, callbackThis, callbackArgs;
      before(function (done) {
        document.close(function (error) {
          callbackThis = this, callbackArgs = arguments;
          done(error);
        }, self);
      });

      it('should not pass an error through the callback', function () {
        callbackArgs.should.have.length(1);
        callbackArgs.should.have.property(0, null);
      });

      it('should invoke the callback with the second argument as `this`', function () {
        callbackThis.should.equal(self);
      });
    });
  });

  describe('An HDT document without a literal dictionary', function () {
    var document;
    before(function (done) {
      hdt.fromFile('./test/test.hdt', function (error, hdtDocument) {
        document = hdtDocument;
        done(error);
      });
    });
    after(function (done) {
      document.close(done);
    });

    describe('being searched for literals', function () {
      it('should throw an error', function (done) {
        document.searchLiterals('abc', function (error) {
          this.should.equal(document);
          error.should.be.an.instanceOf(Error);
          error.message.should.equal('The HDT document does not support literal search');
          done();
        });
      });
    });
  });

  describe('An HDT document with a literal dictionary', function () {
    var document;
    before(function (done) {
      hdt.fromFile('./test/literals.hdt', function (error, hdtDocument) {
        document = hdtDocument;
        done(error);
      });
    });
    after(function (done) {
      document.close(done);
    });

    describe('asked for supported features', function () {
      it('should return an object', function () {
        document.features.should.be.an.instanceof(Object);
      });

      it('should support searchTriples', function () {
        document.features.searchTriples.should.be.true;
      });

      it('should support countTriples', function () {
        document.features.countTriples.should.be.true;
      });

      it('should support searchLiterals', function () {
        document.features.searchLiterals.should.be.true;
      });
    });

    describe('being searched', function () {
      describe('for an existing subject', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples('s', null, null,
            function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array;
          triples.should.have.lengthOf(9);
        });

        it('should estimate the total count', function () {
          totalCount.should.equal(9);
        });
      });

      describe('for a non-existing subject', function () {
        var triples, totalCount;
        before(function (done) {
          document.searchTriples('x', null, null,
            function (error, t, c) { triples = t; totalCount = c; done(error); });
        });

        it('should return an array without matches', function () {
          triples.should.be.an.Array;
          triples.should.have.lengthOf(0);
        });

        it('should estimate the total count as 0', function () {
          totalCount.should.equal(0);
        });
      });

      describe('for the empty literal', function () {
        var literals, totalCount;
        before(function (done) {
          document.searchLiterals('',
            function (error, l, c) { literals = l, totalCount = c; done(error); });
        });

        it('should return the empty array', function () {
          literals.should.eql([]);
        });

        it('should estimate the total count', function () {
          totalCount.should.equal(0);
        });
      });

      describe('for the literal "a"', function () {
        var literals, totalCount;
        before(function (done) {
          document.searchLiterals('a',
            function (error, l, c) { literals = l, totalCount = c; done(error); });
        });

        it('should return literals containing "a"', function () {
          literals.should.eql(['"a"', '"a"@en', '"a"^^bcd', '"abc"', '"abc"@en', '"abc"^^bcd']);
        });

        it('should estimate the total count', function () {
          totalCount.should.equal(6);
        });
      });

      describe('for the literal "b"', function () {
        var literals, totalCount;
        before(function (done) {
          document.searchLiterals('b',
            function (error, l, c) { literals = l, totalCount = c; done(error); });
        });

        it('should return literals containing "b" (with duplicates for multiple matches)', function () {
          literals.should.eql(['"abc"', '"bc"', '"abc"@en', '"bc"@en',
                               '"bc"^^bcd', '"abc"^^bcd', '"bc"^^bcd', '"a"^^bcd', '"abc"^^bcd']);
        });

        it('should estimate the total count', function () {
          totalCount.should.equal(9);
        });
      });

      describe('for the literal "b" with a limit', function () {
        var literals, totalCount;
        before(function (done) {
          document.searchLiterals('b', { limit: 2 },
            function (error, l, c) { literals = l, totalCount = c; done(error); });
        });

        it('should return literals containing "b"', function () {
          literals.should.eql(['"abc"', '"bc"']);
        });

        it('should estimate the total count', function () {
          totalCount.should.equal(9);
        });
      });

      describe('for the literal "b" with an offset', function () {
        var literals, totalCount;
        before(function (done) {
          document.searchLiterals('b', { offset: 4 },
            function (error, l, c) { literals = l, totalCount = c; done(error); });
        });

        it('should return literals containing "b"', function () {
          literals.should.eql(['"bc"^^bcd', '"abc"^^bcd', '"bc"^^bcd', '"a"^^bcd', '"abc"^^bcd']);
        });

        it('should estimate the total count', function () {
          totalCount.should.equal(9);
        });
      });

      describe('for the literal "b" with a very large offset', function () {
        var literals, totalCount;
        before(function (done) {
          document.searchLiterals('b', { offset: 5000 },
            function (error, l, c) { literals = l, totalCount = c; done(error); });
        });

        it('should return the empty array', function () {
          literals.should.eql([]);
        });

        it('should estimate the total count', function () {
          totalCount.should.equal(9);
        });
      });
    });

    describe('for the literal "b" with an offset and a limit', function () {
        var literals, totalCount;
        before(function (done) {
          document.searchLiterals('b', { offset: 4, limit: 2 },
            function (error, l, c) { literals = l, totalCount = c; done(error); });
        });

        it('should return literals containing "b"', function () {
          literals.should.eql(['"bc"^^bcd', '"abc"^^bcd']);
        });

        it('should estimate the total count', function () {
          totalCount.should.equal(9);
        });
      });
  });

  describe('A closed HDT document', function () {
    var document;
    before(function (done) {
      hdt.fromFile('./test/test.hdt', function (error, hdtDocument) {
        document = hdtDocument;
        document.close(done);
      });
    });

    describe('being searched for triples', function () {
      it('should throw an error', function (done) {
        document.searchTriples(null, null, null, function (error) {
          this.should.equal(document);
          error.should.be.an.instanceOf(Error);
          error.message.should.equal('The HDT document cannot be read because it is closed');
          done();
        });
      });
    });

    describe('being searched for literals', function () {
      it('should throw an error', function (done) {
        document.searchLiterals('abc', function (error) {
          this.should.equal(document);
          error.should.be.an.instanceOf(Error);
          error.message.should.equal('The HDT document cannot be read because it is closed');
          done();
        });
      });
    });
  });
});
