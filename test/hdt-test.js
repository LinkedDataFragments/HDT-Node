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
        hdt.fromFile(null, function (error) {
          error.should.be.an.Error;
          error.message.should.equal('Invalid filename: null');
          done();
        });
      });
    });

    describe('with a non-existing file as argument', function () {
      it('should throw an error', function (done) {
        hdt.fromFile('abc', function (error) {
          error.should.be.an.Error;
          error.message.should.equal('Could not open HDT file "abc"');
          done();
        });
      });
    });

    describe('with a non-HDT file as argument', function () {
      it('should throw an error', function (done) {
        hdt.fromFile('./test/hdt-test.js', function (error) {
          error.should.be.an.Error;
          error.message.should.equal('The file "./test/hdt-test.js" is not a valid HDT file');
          done();
        });
      });
    });
  });

  describe('An HDT document for an example HDT file', function () {
    var document;
    before(function (done) {
      hdt.fromFile('./test/test.hdt', function (error, hdtDocument) {
        document = hdtDocument;
        done();
      });
    });
    after(function (done) {
      document.close(done);
    });

    describe('being searched', function () {
      describe('with a non-existing pattern', function () {
        var triples, totalCount;
        before(function (done) {
          document.search('a', null, null,
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
          document.search(null, null, null,
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
          document.search(null, null, null, { offset: 0, limit: 10 },
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
          document.search(null, null, null, { offset: 10, limit: 5 },
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

      describe('with pattern ex:s2 null null', function () {
        var triples, totalCount;
        before(function (done) {
          document.search('http://example.org/s2', null, null,
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

      describe('with pattern ex:s2 null null, offset 200 and limit 1', function () {
        var triples, totalCount;
        before(function (done) {
          document.search('http://example.org/s2', null, null, { offset: 200, limit: 1 },
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
          document.search('http://example.org/s2', '?p', '?o',
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
          document.search(null, 'http://example.org/p2', null,
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

        it('should estimate the total count as 1', function () {
          totalCount.should.equal(1);
        });
      });

      describe('with pattern null ex:p3 null', function () {
        var triples, totalCount;
        before(function (done) {
          document.search(null, 'http://example.org/p3', null,
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

        it('should estimate the total count as 1', function () {
          totalCount.should.equal(1);
        });
      });

      describe('with pattern null null ex:o012', function () {
        var triples, totalCount;
        before(function (done) {
          document.search(null, null, 'http://example.org/o012',
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
      describe('with a non-existing pattern', function () {
        var totalCount;
        before(function (done) {
          document.count('a', null, null,
                         function (error, c) { totalCount = c; done(error); });
        });

        it('should return 0', function () {
          totalCount.should.equal(0);
        });
      });

      describe('with pattern null null null', function () {
        var totalCount;
        before(function (done) {
          document.count(null, null, null,
                         function (error, c) { totalCount = c; done(error); });
        });

        it('should return 132', function () {
          totalCount.should.equal(132);
        });
      });

      describe('with pattern ex:s2 null null', function () {
        var totalCount;
        before(function (done) {
          document.count('http://example.org/s2', null, null,
                         function (error, c) { totalCount = c; done(error); });
        });

        it('should return 10', function () {
          totalCount.should.equal(10);
        });
      });

      describe('with pattern null ex:p2 null', function () {
        var totalCount;
        before(function (done) {
          document.count(null, 'http://example.org/p2', null,
                         function (error, c) { totalCount = c; done(error); });
        });

        it('should return 1', function () {
          totalCount.should.equal(1);
        });
      });

      describe('with pattern null ex:p3 null', function () {
        var totalCount;
        before(function (done) {
          document.count(null, 'http://example.org/p3', null,
                         function (error, c) { totalCount = c; done(error); });
        });

        it('should return 1', function () {
          totalCount.should.equal(1);
        });
      });

      describe('with pattern null null ex:o012', function () {
        var totalCount;
        before(function (done) {
          document.count(null, null, 'http://example.org/o012',
                         function (error, c) { totalCount = c; done(error); });
        });

        it('should return 1', function () {
          totalCount.should.equal(1);
        });
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

    describe('being searched', function () {
      it('should throw an error', function () {
        (function () { document.search(null, null, null, function () {}); })
        .should.throw('The HDT document cannot be read because it is closed');
      });
    });
  });
});
