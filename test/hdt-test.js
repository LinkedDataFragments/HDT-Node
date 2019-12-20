require('should');
const { literal, variable, namedNode, quad, defaultGraph } = require('n3').DataFactory;

const hdt = require('../lib/hdt');

describe('hdt', function () {
  describe('The hdt module', function () {
    it('should be an object', function () {
      hdt.should.be.an.Object();
    });
  });

  describe('creating a new HDT document with fromFile', function () {
    describe('with a non-string argument', function () {
      it('should throw an error', function () {
        return hdt.fromFile(null).then(() => Promise.reject(new Error('Expected an error')), error => {
          error.should.be.an.Error();
          error.message.should.equal('Invalid filename: null');
        });
      });
    });

    describe('with a non-existing file as argument', function () {
      it('should throw an error', function () {
        return hdt.fromFile('abc').then(() => Promise.reject(new Error('Expected an error')), error => {
          error.should.be.an.Error();
          error.message.should.equal('Could not open HDT file "abc"');
        });
      });
    });

    describe('with a non-HDT file as argument', function () {
      it('should throw an error', function () {
        return hdt.fromFile('./test/hdt-test.js').then(() => Promise.reject(new Error('Expected an error')), error => {
          error.should.be.an.Error();
          error.message.should.equal('The file "./test/hdt-test.js" is not a valid HDT file');
        });
      });
    });
  });

  describe('An HDT document for an example HDT file', function () {
    var document;
    before(function () {
      return hdt.fromFile('./test/test.hdt').then(hdtDocument => {
        document = hdtDocument;
      });
    });
    after(function () {
      return document.close();
    });

    describe('asked for supported features', function () {
      it('should return an object', function () {
        document.features.should.be.an.instanceof(Object);
      });

      it('should support searchTriples', function () {
        document.features.searchTriples.should.be.true();
      });

      it('should support countTriples', function () {
        document.features.countTriples.should.be.true();
      });

      it('should not support searchLiterals', function () {
        document.features.searchLiterals.should.be.false();
      });

      it('should support readHeader', function () {
        document.features.readHeader.should.be.true();
      });

      it('should support changeHeader', function () {
        document.features.changeHeader.should.be.true();
      });
    });

    describe('reading the header', function () {
      var header;
      before(function () {
        return document.readHeader().then(result => {
          header = result;
        });
      });
      it('should return a string with matches', function () {
        header.should.be.a.String();
        header.split('\n').should.have.length(23);
        header.indexOf('<file://test/test.ttl> ' +
                       '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ' +
                       '<http://purl.org/HDT/hdt#Dataset>').should.be.above(-1);
        header.indexOf('_:publicationInformation ' +
                       '<http://purl.org/dc/terms/issued> ' +
                       '"2019-01-18T13:09:56+01:00"').should.be.above(-1);
      });
    });

    describe('writing a header and saving to a new file', function () {
      var newhdt;
      var header = '_:dictionary <http://purl.org/HDT/hdt#dictionarymapping> "1" .\n' +
                   '_:dictionary <http://purl.org/HDT/hdt#dictionarysizeStrings> "825" .';
      var outputFile = './test/testOutput.hdt';
      before(function () {
        return document.changeHeader(header, outputFile)
          .then(hdtDocument => {
            newhdt = hdtDocument;
          });
      });
      after(function () {
        return newhdt.close();
      });

      describe('reading the new header', function () {
        var header;
        before(function () {
          return newhdt.readHeader().then(result => {
            header = result;
          });
        });
        it('should return a string with matches', function () {
          header.should.be.a.String();
          header.split('\n').should.have.length(3);
          header.indexOf('_:dictionary ' +
                         '<http://purl.org/HDT/hdt#dictionarymapping> ' +
                         '"1"').should.be.above(-1);
          header.indexOf('_:dictionary ' +
                         '<http://purl.org/HDT/hdt#dictionarysizeStrings> ' +
                         '"825"').should.be.above(-1);
        });
      });
    });

    describe('getting suggestions', function () {
      it('should have correct results for predicate position', function () {
        return document.searchTerms({ prefix: 'http://example.org/', limit:100, position : 'predicate' }).then(suggestions => {
          suggestions.should.have.lengthOf(3);
          suggestions[0].should.eql(namedNode('http://example.org/p1'));
        });
      });

      it('should have correct results for object position', function () {
        return document.searchTerms({ prefix: 'http://example.org/', limit: 2, position : 'object' }).then(suggestions => {
          suggestions[0].should.eql(namedNode('http://example.org/o001'));
          suggestions.should.have.lengthOf(2);
        });
      });

      it('should get suggestions for literals', function () {
        return document.searchTerms({ prefix: '"a', position : 'object' }).then(suggestions => {
          suggestions.should.have.lengthOf(9);
        });
      });

      it('should get suggestions for all literals', function () {
        return document.searchTerms({ prefix: '"', position : 'object' }).then(suggestions => {
          suggestions.should.have.lengthOf(14);
        });
      });

      it('should get all results on empty match', function () {
        return document.searchTerms({ prefix: '', position: 'object' }).then(suggestions => {
          suggestions.should.have.lengthOf(114);
        });
      });

      it('should get all results when prefix is not defined', function () {
        return document.searchTerms({ position: 'object' }).then(suggestions => {
          suggestions.should.have.lengthOf(114);
        });
      });

      it('should return 0 results on negative limit', function () {
        return document.searchTerms({ prefix: 'http://example.org/', limit: -1, position: 'object' }).then(suggestions => {
          suggestions.should.have.lengthOf(0);
        });
      });

      it('should return all results when passed an invalid limit value', function () {
        return document.searchTerms({ prefix: 'http://example.org/', limit: 'sdf', position: 'object' }).then(suggestions => {
          suggestions.should.have.lengthOf(100);
        });
      });

      it('should throw on invalid position', function () {
        return document.searchTerms({ prefix: 'http://example.org/', limit: 'sdf', position: 'bla' }).then(
          () => Promise.reject(new Error('Expected an error')),
          error => {
            error.should.be.an.instanceOf(Error);
            error.message.should.equal('Invalid position argument. Expected subject, predicate or object.');
          }
        );
      });
    });

    describe('fetching distinct terms', function () {
      it('should have correct results for given subject', function () {
        return document.searchTerms({ subject: namedNode('http://example.org/s1'), position: 'predicate' }).then(terms => {
          terms.should.have.lengthOf(1);
          terms[0].should.eql(namedNode('http://example.org/p1'));
        });
      });

      it('should limit results for given subject', function () {
        return document.searchTerms({ subject: namedNode('http://example.org/s2'), limit: 1, position: 'predicate' }).then(terms => {
          terms.should.have.lengthOf(1);
          terms[0].should.eql(namedNode('http://example.org/p1'));
        });
      });

      it('should throw on unsupported position (subject-subject)', function () {
        return document.searchTerms({ subject: namedNode('http://example.org/s1'), position: 'subject' }).then(
          () => Promise.reject(new Error('Expected an error')),
          error => {
            error.should.be.an.instanceOf(Error);
            error.message.should.equal('Unsupported position argument. Expected predicate.');
          }
        );
      });

      it('should throw on unsupported position (subject-object)', function () {
        return document.searchTerms({ subject: namedNode('http://example.org/s1'), position: 'object' }).then(
          () => Promise.reject(new Error('Expected an error')),
          error => {
            error.should.be.an.instanceOf(Error);
            error.message.should.equal('Unsupported position argument. Expected predicate.');
          }
        );
      });

      it('should return 0 results on unspecified subject value', function () {
        return document.searchTerms({ subject: undefined, position: 'predicate' }).then(terms => {
          terms.should.have.lengthOf(0);
        }
        );
      });

      it('should have correct results for given object', function () {
        return document.searchTerms({ object: namedNode('http://example.org/o001'), position: 'predicate' }).then(terms => {
          terms.should.have.lengthOf(2);
          terms[0].should.eql(namedNode('http://example.org/p1'));
          terms[1].should.eql(namedNode('http://example.org/p2'));
        });
      });

      it('should limit results for given object', function () {
        return document.searchTerms({ object: namedNode('http://example.org/o001'), limit: 1, position: 'predicate' }).then(terms => {
          terms.should.have.lengthOf(1);
          terms[0].should.eql(namedNode('http://example.org/p1'));
        });
      });

      it('should throw on unsupported position (object-object)', function () {
        return document.searchTerms({ object: namedNode('http://example.org/o001'), position: 'object' }).then(
          () => Promise.reject(new Error('Expected an error')),
          error => {
            error.should.be.an.instanceOf(Error);
            error.message.should.equal('Unsupported position argument. Expected predicate.');
          }
        );
      });

      it('should throw on unsupported position (object-subject)', function () {
        return document.searchTerms({ object: namedNode('http://example.org/o001'), position: 'subject' }).then(
          () => Promise.reject(new Error('Expected an error')),
          error => {
            error.should.be.an.instanceOf(Error);
            error.message.should.equal('Unsupported position argument. Expected predicate.');
          }
        );
      });

      it('should throw on invalid position', function () {
        return document.searchTerms({ object: namedNode('http://example.org/o001'), position: 'obj' }).then(
          () => Promise.reject(new Error('Expected an error')),
          error => {
            error.should.be.an.instanceOf(Error);
            error.message.should.equal('Invalid position argument. Expected subject, predicate or object.');
          }
        );
      });

      it('should return 0 results on unspecified object value', function () {
        return document.searchTerms({ object: namedNode(''), limit: 0, position: 'predicate' }).then(terms => {
          terms.should.have.lengthOf(0);
        }
        );
      });

      it('should return 0 results on negative limit', function () {
        return document.searchTerms({ object: namedNode('http://example.org/o001'), limit: -1, position: 'predicate' }).then(terms => {
          terms.should.have.lengthOf(0);
        });
      });

      it('should return all results on invalid limit', function () {
        return document.searchTerms({ object: namedNode('http://example.org/o001'), limit: 'sdf', position: 'predicate' }).then(terms => {
          terms.should.have.lengthOf(2);
        });
      });

      it('should have correct results for given subject and object', function () {
        return document.searchTerms({ subject: namedNode('http://example.org/s1'), object: namedNode('http://example.org/o001'), position: 'predicate' }).then(terms => {
          terms.should.have.lengthOf(1);
          terms[0].should.eql(namedNode('http://example.org/p1'));
        });
      });

      it('should limit results for given subject and object', function () {
        return document.searchTerms({ subject: namedNode('http://example.org/s2'), object: namedNode('http://example.org/o001'), limit: 1, position: 'predicate' }).then(terms => {
          terms.should.have.lengthOf(1);
          terms[0].should.eql(namedNode('http://example.org/p1'));
        });
      });

      it('should throw on unsupported position (subject and object - subject)', function () {
        return document.searchTerms({ subject: namedNode('http://example.org/s1'), object: namedNode('http://example.org/o001'), position: 'subject' }).then(
          () => Promise.reject(new Error('Expected an error')),
          error => {
            error.should.be.an.instanceOf(Error);
            error.message.should.equal('Unsupported position argument. Expected predicate.');
          }
        );
      });

      it('should throw on unsupported position (subject and object - object)', function () {
        return document.searchTerms({ subject: namedNode('http://example.org/s1'), object: namedNode('http://example.org/o001'), position: 'object' }).then(
          () => Promise.reject(new Error('Expected an error')),
          error => {
            error.should.be.an.instanceOf(Error);
            error.message.should.equal('Unsupported position argument. Expected predicate.');
          }
        );
      });
    });

    describe('being searched', function () {
      describe('with a non-existing pattern', function () {
        var triples, totalCount;
        before(function () {
          return document.searchTriples(namedNode('a'), null, null).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.be.empty();
        });

        it('should estimate the total count as 0', function () {
          totalCount.should.equal(0);
        });
      });

      describe('with pattern null null null', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null, null, null).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(134);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s1'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o001'),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 134', function () {
          totalCount.should.equal(134);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null null, offset 0 and limit 10', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null, null, null, { offset: 0, limit: 10 }).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with all matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(10);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s1'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o001'),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 134', function () {
          totalCount.should.equal(134);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null null, offset 0 and limit 0', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null, null, null, { offset: 0, limit: 0 }).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an empty array', function () {
          triples.should.be.an.Array();
          triples.should.have.length(0);
        });

        it('should estimate the total count as 134', function () {
          totalCount.should.equal(134);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null null, offset 0 and limit Infinity', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null, null, null, { offset: 0, limit: Infinity }).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with all matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(134);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s1'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o001'),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 134', function () {
          totalCount.should.equal(134);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null null, offset 0 and limit -Infinity', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null, null, null, { offset: 0, limit: -Infinity }).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an empty array', function () {
          triples.should.be.an.Array();
          triples.should.have.length(0);
        });

        it('should estimate the total count as 134', function () {
          totalCount.should.equal(134);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null null, offset Infinity and limit Infinity', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null, null, null, { offset: Infinity, limit: Infinity }).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an empty array', function () {
          triples.should.be.an.Array();
          triples.should.have.length(0);
        });

        it('should estimate the total count as 134', function () {
          totalCount.should.equal(134);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null null, offset -Infinity and limit Infinity', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null, null, null, { offset: -Infinity, limit: Infinity }).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with all matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(134);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s1'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o001'),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 134', function () {
          totalCount.should.equal(134);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null null, offset 10 and limit 5', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null, null, null, { offset: 10, limit: 5 }).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(5);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s1'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o011'),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 134', function () {
          totalCount.should.equal(134);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null null, offset 200 and limit 5', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null, null, null, { offset: 200, limit: 5 }).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.be.empty();
        });

        it('should estimate the total count as 134', function () {
          totalCount.should.equal(134);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern ex:s2 null null', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(namedNode('http://example.org/s2'), null, null).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(10);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s2'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o001'),
            defaultGraph()
          ));
          triples[1].should.eql(quad(
            namedNode('http://example.org/s2'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o002'),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 10', function () {
          totalCount.should.equal(10);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern ex:s2 ex:p1 null', function () {
        var triples;
        before(function () {
          return document.searchTriples(namedNode('http://example.org/s2'), namedNode('http://example.org/p1'), null).then(result => {
            triples = result.triples;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(10);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s2'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o001'),
            defaultGraph()
          ));
          triples[1].should.eql(quad(
            namedNode('http://example.org/s2'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o002'),
            defaultGraph()
          ));
        });
      });

      describe('with pattern ex:s2 ex:p1 ex:o010', function () {
        var triples;
        before(function () {
          return document.searchTriples(namedNode('http://example.org/s2'), namedNode('http://example.org/p1'), namedNode('http://example.org/o010')).then(result => {
            triples = result.triples;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(1);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s2'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o010'),
            defaultGraph()
          ));
        });
      });

      // Use this pattern to check whether the ObjectIndexIterator implementation
      // in hdt-cpp works.
      // Link to issue -> https://github.com/rdfhdt/hdt-cpp/issues/84
      describe('with pattern null null ex:o010', function () {
        var triples;
        before(function () {
          return document.searchTriples(null, null, namedNode('http://example.org/o010')).then(result => {
            triples = result.triples;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(3);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s1'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o010'),
            defaultGraph()
          ));
        });
      });

      describe('with pattern ex:s2 null null, offset 2 and limit 1', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(namedNode('http://example.org/s2'), null, null, { offset: 2, limit: 1 }).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(1);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s2'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o003'),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 10', function () {
          totalCount.should.equal(10);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern ex:s2 null null, offset 200 and limit 1', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(namedNode('http://example.org/s2'), null, null, { offset: 200, limit: 1 }).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.be.empty();
        });

        it('should estimate the total count as 10', function () {
          totalCount.should.equal(10);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern ex:s2 ?p ?o', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(namedNode('http://example.org/s2'), '?p', variable('?p')).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(10);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s2'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o001'),
            defaultGraph()
          ));
          triples[1].should.eql(quad(
            namedNode('http://example.org/s2'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o002'),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 10', function () {
          totalCount.should.equal(10);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null ex:p2 null, offset 2, limit 2', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null, namedNode('http://example.org/p2'), null, { offset: 2, limit: 2 }).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(2);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s3'),
            namedNode('http://example.org/p2'),
            namedNode('http://example.org/o003'),
            defaultGraph()
          ));
          triples[1].should.eql(quad(
            namedNode('http://example.org/s3'),
            namedNode('http://example.org/p2'),
            namedNode('http://example.org/o004'),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 10', function () {
          totalCount.should.equal(10);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null ex:p2 null, offset 200', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null, namedNode('http://example.org/p2'), null, { offset: 200 }).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an empty array', function () {
          triples.should.be.an.Array();
          triples.should.be.empty();
          triples.should.have.length(0);
        });

        it('should estimate the total count as 10', function () {
          totalCount.should.equal(10);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null ex:p2 null', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null, namedNode('http://example.org/p2'), null).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(10);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s3'),
            namedNode('http://example.org/p2'),
            namedNode('http://example.org/o001'),
            defaultGraph()
          ));
          triples[1].should.eql(quad(
            namedNode('http://example.org/s3'),
            namedNode('http://example.org/p2'),
            namedNode('http://example.org/o002'),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 10', function () {
          totalCount.should.equal(10);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null ex:p1 ""', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null, namedNode('http://example.org/p1'),  literal('')).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(0);
        });

        it('should estimate the total count as 0', function () {
          totalCount.should.equal(0);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null ex:p3 null', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null, namedNode('http://example.org/p3'), null).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(14);

          triples[0].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('', namedNode('http://www.w3.org/2001/XMLSchema#string')),
            defaultGraph()
          ));
          triples[1].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('', 'en'),
            defaultGraph()
          ));
          triples[2].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('', namedNode('http://example.org/literal')),
            defaultGraph()
          ));
          triples[3].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('', namedNode('http://www.w3.org/2001/XMLSchema#string')),
            defaultGraph()
          ));
          triples[4].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('"a"^^xsd:string', 'en'),
            defaultGraph()
          ));
          triples[5].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('a', namedNode('http://www.w3.org/2001/XMLSchema#string')),
            defaultGraph()
          ));
          triples[6].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('a', 'en'),
            defaultGraph()
          ));
          triples[7].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('a', namedNode('abc@def')),
            defaultGraph()
          ));
          triples[8].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('a', namedNode('http://example.org/literal')),
            defaultGraph()
          ));
          triples[9].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('a', namedNode('http://www.w3.org/2001/XMLSchema#string')),
            defaultGraph()
          ));
          triples[10].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('a"b\'c\\\r\n\\', namedNode('http://www.w3.org/2001/XMLSchema#string')),
            defaultGraph()
          ));
          triples[11].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('a"b\'c\\\r\n\\', 'en'),
            defaultGraph()
          ));
          triples[12].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('a"b\'c\\\r\n\\', namedNode('http://example.org/literal')),
            defaultGraph()
          ));
          triples[13].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('a"b\'c\\\r\n\\', namedNode('http://www.w3.org/2001/XMLSchema#string')),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 14', function () {
          totalCount.should.equal(14);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null "a"^^http://example.org/literal', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null,  null, literal('a', namedNode('http://example.org/literal'))).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(1);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('a', namedNode('http://example.org/literal')),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 1', function () {
          totalCount.should.equal(1);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null "\"a\"^^xsd:string"@en', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null,  null, literal('\"a\"^^xsd:string', 'en')).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(1);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('"a"^^xsd:string', 'en'),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 1', function () {
          totalCount.should.equal(1);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null ""a"^^abc@def', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null,  null, literal('a', namedNode('abc@def'))).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(1);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s4'),
            namedNode('http://example.org/p3'),
            literal('a', namedNode('abc@def')),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 1', function () {
          totalCount.should.equal(1);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null ex:o012', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(null,  null, namedNode('http://example.org/o012')).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(1);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s1'),
            namedNode('http://example.org/p1'),
            namedNode('http://example.org/o012'),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 1', function () {
          totalCount.should.equal(1);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern ex:s3 null ex:o001', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(namedNode('http://example.org/s3'),  null, namedNode('http://example.org/o001')).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(1);
          triples[0].should.eql(quad(
            namedNode('http://example.org/s3'),
            namedNode('http://example.org/p2'),
            namedNode('http://example.org/o001'),
            defaultGraph()
          ));
        });

        it('should estimate the total count as 1', function () {
          totalCount.should.equal(10);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(false);
        });
      });

      describe('with pattern ex:s3 null ex:o001 and offset 1', function () {
        var triples, totalCount, hasExactCount;
        before(function () {
          return document.searchTriples(namedNode('http://example.org/s3'),  null, namedNode('http://example.org/o001'), { offset : 1 }).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(0);
          triples.should.be.empty();
        });

        it('should estimate the total count as 1', function () {
          totalCount.should.equal(10);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(false);
        });
      });
    });

    describe('being counted', function () {
      describe('with a non-existing pattern', function () {
        var totalCount, hasExactCount;
        before(function () {
          return document.countTriples(namedNode('a'), null, null).then(result => {
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return 0', function () {
          totalCount.should.equal(0);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null null', function () {
        var totalCount, hasExactCount;
        before(function () {
          return document.countTriples(null, null, null).then(result => {
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return 134', function () {
          totalCount.should.equal(134);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern ex:s2 null null', function () {
        var totalCount, hasExactCount;
        before(function () {
          return document.countTriples(namedNode('http://example.org/s2'), null, null).then(result => {
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return 10', function () {
          totalCount.should.equal(10);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null ex:p2 null', function () {
        var totalCount, hasExactCount;
        before(function () {
          return document.countTriples(null, namedNode('http://example.org/p2'), null).then(result => {
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return 10', function () {
          totalCount.should.equal(10);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null ex:p3 null', function () {
        var totalCount, hasExactCount;
        before(function () {
          return document.countTriples(null, namedNode('http://example.org/p3'), null).then(result => {
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return 14', function () {
          totalCount.should.equal(14);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null ex:o012', function () {
        var totalCount, hasExactCount;
        before(function () {
          return document.countTriples(null, null, namedNode('http://example.org/o012')).then(result => {
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return 1', function () {
          totalCount.should.equal(1);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });

      describe('with pattern null null "a"^^http://example.org/literal', function () {
        var totalCount, hasExactCount;
        before(function () {
          return document.countTriples(null, null, literal('a', namedNode('http://example.org/literal'))).then(result => {
            totalCount = result.totalCount;
            hasExactCount = result.hasExactCount;
          });
        });

        it('should return 1', function () {
          totalCount.should.equal(1);
        });

        it('should be an exact count', function () {
          hasExactCount.should.equal(true);
        });
      });
    });
  });

  describe('An HDT document without a literal dictionary', function () {
    var document;
    before(function () {
      return hdt.fromFile('./test/test.hdt').then(hdtDocument => {
        document = hdtDocument;
      });
    });
    after(function () {
      return document.close();
    });

    describe('being searched for literals', function () {
      it('should throw an error', function () {
        return document.searchLiterals('abc').then(
          () => Promise.reject(new Error('expected an error')),
          error => {
            error.should.be.an.instanceOf(Error);
            error.message.should.equal('The HDT document does not support literal search');
          }
        );
      });
    });
  });

  describe('An HDT document with a literal dictionary', function () {
    var document;
    before(function () {
      return hdt.fromFile('./test/literals.hdt').then(hdtDocument => {
        document = hdtDocument;
      });
    });
    after(function () {
      return document.close();
    });

    describe('asked for supported features', function () {
      it('should return an object', function () {
        document.features.should.be.an.instanceof(Object);
      });

      it('should support searchTriples', function () {
        document.features.searchTriples.should.be.true();
      });

      it('should support countTriples', function () {
        document.features.countTriples.should.be.true();
      });

      it('should support searchLiterals', function () {
        document.features.searchLiterals.should.be.true();
      });

      it('should support readHeader', function () {
        document.features.readHeader.should.be.true();
      });

      it('should support changeHeader', function () {
        document.features.changeHeader.should.be.true();
      });
    });

    describe('reading the header', function () {
      var header;
      before(function () {
        return document.readHeader().then(result => {
          header = result;
        });
      });
      it('should return a string with matches', function () {
        header.should.be.a.String();
        header.split('\n').should.have.length(29);
        header.indexOf('<file://literals.ttl> ' +
                       '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ' +
                       '<http://purl.org/HDT/hdt#Dataset>').should.be.above(-1);
        header.indexOf('_:publicationInformation ' +
                       '<http://purl.org/dc/terms/issued> ' +
                       '"2019-01-18T11:37:23+01:00"').should.be.above(-1);
      });
    });

    describe('being searched', function () {
      describe('for an existing subject', function () {
        var triples, totalCount;
        before(function () {
          return document.searchTriples(namedNode('s'), null, null).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
          });
        });

        it('should return an array with matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(12);
        });

        it('should estimate the total count', function () {
          totalCount.should.equal(12);
        });
      });

      describe('for a non-existing subject', function () {
        var triples, totalCount;
        before(function () {
          return document.searchTriples(namedNode('x'), null, null).then(result => {
            triples = result.triples;
            totalCount = result.totalCount;
          });
        });

        it('should return an array without matches', function () {
          triples.should.be.an.Array();
          triples.should.have.length(0);
        });

        it('should estimate the total count as 0', function () {
          totalCount.should.equal(0);
        });
      });

      describe('for the empty literal', function () {
        var literals, totalCount;
        before(function () {
          return document.searchLiterals('').then(result => {
            literals = result.literals;
            totalCount = result.totalCount;
          });
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
        before(function () {
          return document.searchLiterals('a').then(result => {
            literals = result.literals;
            totalCount = result.totalCount;
          });
        });

        it('should return literals containing "a"', function () {
          literals.should.eql([
            literal('a', namedNode('http://www.w3.org/2001/XMLSchema#string')),
            literal('a', 'en'),
            literal('a', namedNode('bcd')),
            literal('cd', namedNode('ab@cd')),
            literal('ab^^cd', 'en'),
            literal('abc', namedNode('http://www.w3.org/2001/XMLSchema#string')),
            literal('abc', 'en'),
            literal('abc', namedNode('bcd')),
            literal('', namedNode('abc@d')),
          ]);
        });

        it('should estimate the total count', function () {
          totalCount.should.equal(9);
        });
      });

      describe('for the literal "b"', function () {
        var literals, totalCount;
        before(function () {
          return document.searchLiterals('b').then(result => {
            literals = result.literals;
            totalCount = result.totalCount;
          });
        });


        it('should return literals containing "b" (with duplicates for multiple matches)', function () {
          literals.should.eql([
            literal('cd', namedNode('ab@cd')),
            literal('ab^^cd', 'en'),
            literal('abc', namedNode('http://www.w3.org/2001/XMLSchema#string')),
            literal('bc', namedNode('http://www.w3.org/2001/XMLSchema#string')),
            literal('abc', 'en'),
            literal('bc', 'en'),
            literal('abc', namedNode('bcd')),
            literal('bc', namedNode('bcd')),
            literal('', namedNode('abc@d')),
            literal('a', namedNode('bcd')),
            literal('abc', namedNode('bcd')),
            literal('bc', namedNode('bcd')),
          ]);
        });

        it('should estimate the total count', function () {
          totalCount.should.equal(12);
        });
      });

      describe('for the literal "b" with a limit', function () {
        var literals, totalCount;
        before(function () {
          return document.searchLiterals('b', { limit : 2 }).then(result => {
            literals = result.literals;
            totalCount = result.totalCount;
          });
        });

        it('should return literals containing "b"', function () {
          literals.should.eql([
            literal('cd', namedNode('ab@cd')),
            literal('ab^^cd', 'en'),
          ]);
        });

        it('should estimate the total count', function () {
          totalCount.should.equal(12);
        });
      });

      describe('for the literal "b" with an offset', function () {
        var literals, totalCount;
        before(function () {
          return document.searchLiterals('b', { offset: 4 }).then(result => {
            literals = result.literals;
            totalCount = result.totalCount;
          });
        });


        it('should return literals containing "b"', function () {
          literals.should.eql([
            literal('abc', 'en'),
            literal('bc', 'en'),
            literal('abc', namedNode('bcd')),
            literal('bc', namedNode('bcd')),
            literal('', namedNode('abc@d')),
            literal('a', namedNode('bcd')),
            literal('abc', namedNode('bcd')),
            literal('bc', namedNode('bcd')),
          ]);
        });

        it('should estimate the total count', function () {
          totalCount.should.equal(12);
        });
      });

      describe('for the literal "b" with a very large offset', function () {
        var literals, totalCount;
        before(function () {
          return document.searchLiterals('b', { offset: 5000 }).then(result => {
            literals = result.literals;
            totalCount = result.totalCount;
          });
        });

        it('should return the empty array', function () {
          literals.should.eql([]);
        });

        it('should estimate the total count', function () {
          totalCount.should.equal(12);
        });
      });
    });

    describe('for the literal "b" with an offset and a limit', function () {
      var literals, totalCount;
      before(function () {
        return document.searchLiterals('b', { offset: 4, limit: 2 }).then(result => {
          literals = result.literals;
          totalCount = result.totalCount;
        });
      });


      it('should return literals containing "b"', function () {
        literals.should.eql([
          literal('abc', 'en'),
          literal('bc', 'en'),
        ]);
      });

      it('should estimate the total count', function () {
        totalCount.should.equal(12);
      });
    });
  });
  describe('A closed HDT document', function () {
    var document;
    before(function () {
      return hdt.fromFile('./test/test.hdt').then(hdtDocument => {
        document = hdtDocument;
        return document.close();
      });
    });

    describe('reading the header', function () {
      it('should throw an error', function () {
        return document.readHeader().then(() =>
            Promise.reject(new Error('Expected an error')),
          error => {
            error.should.be.an.instanceOf(Error);
            error.message.should.equal('The HDT document cannot be accessed because it is closed');
          }
        );
      });
    });

    describe('being searched for triples', function () {
      it('should throw an error', function () {
        return document.searchTriples(null, null, null).then(() =>
            Promise.reject(new Error('Expected an error')),
          error => {
            error.should.be.an.instanceOf(Error);
            error.message.should.equal('The HDT document cannot be accessed because it is closed');
          }
        );
      });
    });

    describe('being searched for literals', function () {
      it('should throw an error', function () {
        return document.searchLiterals('abc').then(() =>
            Promise.reject(new Error('Expected an error')),
          error => {
            error.should.be.an.instanceOf(Error);
            error.message.should.equal('The HDT document cannot be accessed because it is closed');
          }
        );
      });
    });
  });
});
