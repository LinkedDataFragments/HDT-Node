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

  describe('calling search', function () {
    describe('on an HDT document for an example HDT file', function () {
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

      describe('with pattern null null null', function () {
        var results;
        before(function (done) {
          document.search(null, null, null,
                          function (error, triples) { results = triples; done(error); });
        });

        it('should return an array with matches', function () {
          results.should.be.an.Array;
          results.should.have.lengthOf(132);
          results[0].should.eql({ subject:   'http://example.org/s1',
                                  predicate: 'http://example.org/p1',
                                  object:    'http://example.org/o001' });
        });
      });

      describe('with pattern ex:s2 null null', function () {
        var results;
        before(function (done) {
          document.search('http://example.org/s2', null, null,
                          function (error, triples) { results = triples; done(error); });
        });

        it('should return an array with matches', function () {
          results.should.be.an.Array;
          results.should.have.lengthOf(10);
          results[0].should.eql({ subject:   'http://example.org/s2',
                                  predicate: 'http://example.org/p1',
                                  object:    'http://example.org/o001' });
          results[1].should.eql({ subject:   'http://example.org/s2',
                                  predicate: 'http://example.org/p1',
                                  object:    'http://example.org/o002' });
        });
      });

      describe('with pattern null ex:p2 null', function () {
        var results;
        before(function (done) {
          document.search(null, 'http://example.org/p2', null,
                          function (error, triples) { results = triples; done(error); });
        });

        it('should return an array with matches', function () {
          results.should.be.an.Array;
          results.should.have.lengthOf(10);
          results[0].should.eql({ subject:   'http://example.org/s3',
                                  predicate: 'http://example.org/p2',
                                  object:    'http://example.org/o001' });
          results[1].should.eql({ subject:   'http://example.org/s3',
                                  predicate: 'http://example.org/p2',
                                  object:    'http://example.org/o002' });
        });
      });

      describe('with pattern null ex:p3 null', function () {
        var results;
        before(function (done) {
          document.search(null, 'http://example.org/p3', null,
                          function (error, triples) { results = triples; done(error); });
        });

        it('should return an array with matches', function () {
          results.should.be.an.Array;
          results.should.have.lengthOf(12);
          results[0].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '""' });
          results[1].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '""@en' });
          results[2].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '""^^http://example.org/literal' });
          results[3].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '""^^http://www.w3.org/2001/XMLSchema#string' });
          results[4].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '"a"' });
          results[5].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '"a"@en' });
          results[6].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '"a"^^http://example.org/literal' });
          results[7].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '"a"^^http://www.w3.org/2001/XMLSchema#string' });
          results[8].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '"a"b\'c\\\r\n\\"' });
          results[9].should.eql({ subject:   'http://example.org/s4',
                                  predicate: 'http://example.org/p3',
                                  object:    '"a"b\'c\\\r\n\\"@en' });
          results[10].should.eql({ subject:   'http://example.org/s4',
                                   predicate: 'http://example.org/p3',
                                   object:    '"a"b\'c\\\r\n\\"^^http://example.org/literal' });
          results[11].should.eql({ subject:   'http://example.org/s4',
                                   predicate: 'http://example.org/p3',
                                   object:    '"a"b\'c\\\r\n\\"^^http://www.w3.org/2001/XMLSchema#string' });
        });
      });

      describe('with pattern null null ex:o012', function () {
        var results;
        before(function (done) {
          document.search(null, null, 'http://example.org/o012',
                          function (error, triples) { results = triples; done(error); });
        });

        it('should return an array with matches', function () {
          results.should.be.an.Array;
          results.should.have.lengthOf(1);
          results[0].should.eql({ subject:   'http://example.org/s1',
                                  predicate: 'http://example.org/p1',
                                  object:    'http://example.org/o012' });
        });
      });
    });

    describe('on a closed HDT document', function () {
      var document;
      before(function (done) {
        hdt.fromFile('./test/test.hdt', function (error, hdtDocument) {
          document = hdtDocument;
          document.close(done);
        });
      });
      it('should throw an error', function () {
        (function () { document.search(null, null, null, function () {}); })
        .should.throw('The HDT document cannot be read because it is closed');
      });
    });
  });
});
