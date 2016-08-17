require('should');
var fs = require('fs');
var hdt = require('../lib/hdt');
var targetHdtFile = './test/generateFile-data/test.hdt';

function delTargetFile(done) {
  fs.unlink(targetHdtFile, function(e) {
    //ignore file not exist errors
    if (e && e.code !== 'ENOENT') return done(e);
    fs.unlink(targetHdtFile + '.index', function(e) {
      if (e && e.code === 'ENOENT') return done();
      done(e);
    });
  });
}
describe('generateFile', function () {

  describe('converting ntriples to hdt', function () {
    describe('with a non-string input file path', function () {
      before(delTargetFile);
      it('should throw an error', function (done) {
        var self = {};
        // ntriples, nquad, n3, turtle, rdfxml
        hdt.generateFile(null, targetHdtFile, {format: 'ntriples'}, function (error) {
          this.should.equal(self);
          error.should.be.an.Error;
          error.message.should.equal('Invalid input filename: null');
          done();
        }, function(){},self);
      });
    });
    describe('with a non-string output file path', function () {
      before(delTargetFile);
      it('should throw an error', function (done) {
        var self = {};
        // ntriples, nquad, n3, turtle, rdfxml
        hdt.generateFile('./test/generateFile-data/test.nt', null, {format: 'ntriples'}, function (error) {
          error.should.be.an.Error;
          error.message.should.equal('Invalid target filename: null');
          done();
        }, function(){}, self);
      });
    });
    describe('with a non-string base URI', function () {
      before(delTargetFile);
      it('should throw an error', function (done) {
        hdt.generateFile('./test/generateFile-data/test.nt', targetHdtFile, {format: 'ntriples', baseUri: 2}, function (error) {
          error.should.be.an.Error;
          error.message.should.equal('Invalid base URI: 2');
          done();
        });
      });
    });
    describe('with non-object HDT specs', function () {
      before(delTargetFile);
      it('should throw an error', function (done) {
        hdt.generateFile('./test/generateFile-data/test.nt', targetHdtFile, {format: 'ntriples', hdtSpecs: 2}, function (error) {
          error.should.be.an.Error;
          error.message.should.equal('HDT specs should be an object: 2');
          done();
        });
      });
    });
    describe('without self value', function () {
      before(delTargetFile);
      it('should invoke the callback with `global` as `this`', function (done) {
        hdt.generateFile('./test/generateFile-data/test.nt', targetHdtFile, {format: 'ntriples'}, function (error, document) {
          this.should.equal(global);
          document.close();
          done(error);
        });
      });
    });
    describe('with a progress callback function', function () {
      var progressVals = [];
      before(function(done) {
        delTargetFile(function(e) {
          if (e) return done(e);
          hdt.generateFile('./test/generateFile-data/large.nt', targetHdtFile, function (error) {
            done(error);
          },function(prog) {
            progressVals.push(prog);
          });
        });

      });

      it('should monotonically increase', function () {
        var lastVal = -1;
        progressVals.forEach(function(val) {
          val.should.be.above(lastVal);
          lastVal = val;
        });
      });
      it('should end progress with 100', function () {
        progressVals[progressVals.length-1].should.equal(100);
      });
      it('should start progress with 0', function () {
        progressVals[0].should.equal(0);
      });
    });
    describe('with a self value', function () {
      before(delTargetFile);
      it('should invoke the callback with that value as `this`', function (done) {
        var self = {};
        hdt.generateFile('./test/generateFile-data/test.nt', targetHdtFile, {format: 'ntriples'}, function (error, document) {
          if (error) return done(error);
          this.should.equal(self);
          document.close();
          done(error);
        }, function(){}, self);
      });
    });
    describe('with an invalid input file', function () {
      before(delTargetFile);
      it('should throw an error', function (done) {
        hdt.generateFile('./test/generateFile-data/testInvalid.nt', targetHdtFile, {format: 'ntriples'}, function (error) {
          error.should.be.an.Error;
          done();
        });
      });
    });
    it('should create an hdt file', function (done) {
      before(delTargetFile);
      hdt.generateFile('./test/generateFile-data/test.nt', targetHdtFile, {format: 'ntriples'}, function (error, document) {
        document.close();
        fs.stat(targetHdtFile,done);
      });
    });

    /**
    The built-in ntriple parser does not support base IRIs. Disable this test until
    a better parser is used
    **/
    describe.skip('without explicit base IRI', function () {
      before(delTargetFile);
      it('should use local filename as base IRI', function (done) {
        hdt.generateFile('./test/generateFile-data/test.nt', targetHdtFile, {format: 'ntriples'}, function (error, document) {
          document.searchTriples(null, null, null, function (error, triples, totalCount) {
            totalCount.should.equal(1);
            triples.pop().object.indexOf('file://').should.equal(0);
            document.close();
            done(error);
          });
        });
      });
    });
    /**
    The built-in ntriple parser does not support base IRIs. Disable this test until
    a better parser is used
    **/
    describe.skip('with explicit base IRI', function () {
      before(delTargetFile);
      it('should use local filename as base IRI', function (done) {
        hdt.generateFile('./test/generateFile-data/test.nt', targetHdtFile, {format: 'ntriples', baseUri: 'http://test.org'}, function (error, document) {
          document.searchTriples(null, null, null, function (error, triples, totalCount) {
            totalCount.should.equal(1);
            triples.pop().object.indexOf('http://test.org').should.equal(0);
            document.close();
            done(error);
          });
        });
      });
    });
  });
  describe('converting compressed ntriples to hdt', function () {
    it('should create an hdt file', function (done) {
      before(delTargetFile);
      hdt.generateFile('./test/generateFile-data/test.nt.gz', targetHdtFile, {format: 'ntriples'}, function (error, document) {
        document.close();
        fs.stat(targetHdtFile,done);
      });
    });
  });
  describe('converting default RDF format to HDT', function() {
    beforeEach(delTargetFile);
    it('should parse ntriples', function (done) {
      hdt.generateFile('./test/generateFile-data/test.nt', targetHdtFile, function (error) {
        done(error);
      });
    });
    it('should not parse nquads', function (done) {
      hdt.generateFile('./test/generateFile-data/test.nq', targetHdtFile, function (error) {
        error.should.be.an.Error;
        done();
      });
    });
  });
});
