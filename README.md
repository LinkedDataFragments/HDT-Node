# HDT for Node.js
[![npm version](https://badge.fury.io/js/hdt.svg)](https://www.npmjs.com/package/hdt)
[![Build status](https://github.com/LinkedDataFragments/HDT-Node/workflows/CI/badge.svg)](https://github.com/LinkedDataFragments/HDT-Node/actions?query=workflow%3ACI)
[![Dependency Status](https://david-dm.org/RubenVerborgh/HDT-Node.svg)](https://david-dm.org/RubenVerborgh/HDT-Node)
[![devDependency Status](https://david-dm.org/RubenVerborgh/HDT-Node/dev-status.svg)](https://david-dm.org/RubenVerborgh/HDT-Node#info=devDependencies)

[HDT (Header Dictionary Triples)](http://www.rdfhdt.org/) is a compressed format
for [RDF triples](http://www.w3.org/TR/2014/REC-rdf11-concepts-20140225/#data-model).
<br>
The `hdt` npm package for Node.js brings fast access to HDT files through C bindings.


## Usage

### Importing the library
Install the library by adding `hdt` to your `package.json` or executing

```bash
$ npm install hdt
```

Then require the library.

```JavaScript
const hdt = require('hdt');
```

### Opening and closing an HDT document
Open an HDT document with `hdt.fromFile`,
which takes a filename as argument and returns the HDT document in a promise.
Close the document with `close`.

```JavaScript
hdt.fromFile('./test/test.hdt').then(function(hdtDocument) {
  // Don't forget to close the document when you're done
  return hdtDocument.close();
});
```

### Searching for triples matching a pattern
Search for triples with `search`,
which takes subject, predicate, object, and options arguments.
Subject, predicate, and object can be IRIs or literals,
[represented as simple strings](https://github.com/RubenVerborgh/N3.js#triple-representation).
If any of these parameters is `null` or a variable, it is considered a wildcard.
Optionally, an offset and limit can be passed in an options object,
selecting only the specified subset.

The promise returns an object with an array of triples, the total number of expected triples for the pattern,
and whether the total count is an estimate or exact.

```JavaScript
var doc;
hdt.fromFile('./test/test.hdt')
  .then(function(hdtDocument) {
    doc = hdtDocument;
    return doc.searchTriples('http://example.org/s1', null, null, { offset: 0, limit: 10 })
  })
  .then(function(result) {
    console.log('Approximately ' + result.totalCount + ' triples match the pattern.');
    result.triples.forEach(function (triple) { console.log(triple); });
    return doc.close();
  });
```

### Counting triples matching a pattern
Retrieve an estimate of the total number of triples matching a pattern with `count`,
which takes subject, predicate, and object arguments.

```JavaScript
var doc;
hdt.fromFile('./test/test.hdt')
  .then(function(hdtDocument) {
    doc = hdtDocument;
    return doc.countTriples('http://example.org/s1', null, null);
  })
  .then(function(result) {
    console.log('Approximately ' + result.totalCount + ' triples match the pattern.');
    return doc.close()
  });
```

### Search terms starting with a prefix
Find terms (literals and IRIs) that start with a given prefix.

```JavaScript
hdtDocument.searchTerms({ prefix: 'http://example.org/', limit: 100, position: 'object' })
  .then(function(suggestions) {
    console.log('Found ' + suggestions.length + ' suggestions');
    return hdtDocument.close();
  });
```

### Fetching unique predicates for a subject and/or an object

Find all unique predicates for a given subject argument.

```JavaScript
hdtDocument.searchTerms({ subject: 'http://example.org/s1' limit: 10, position: 'predicate' })
  .then(function(terms) {
    console.log('Found ' + terms.length + ' unique predicates');
    return hdtDocument.close();
  });
```

Find all unique predicates for a given object argument.

```JavaScript
hdtDocument.searchTerms({ object: 'http://example.org/o1', limit: 10, position: 'predicate' })
  .then(function(terms) {
    console.log('Found ' + terms.length + ' unique predicates');
    return hdtDocument.close();
  });
```

Find all unique predicates for given subject and object arguments.

```JavaScript
hdtDocument.searchTerms({ subject: 'http://example.org/s1', object: 'http://example.org/o1', limit: 10, position: 'predicate' })
  .then(function(terms) {
    console.log('Found ' + terms.length + ' unique predicates');
    return hdtDocument.close();
  });
```

### Searching literals containing a substring
In an HDT file that was [generated with an FM index](https://github.com/LinkedDataFragments/hdt-cpp/blob/master/hdt-lib/presets/fmindex.hdtcfg),
you can search for literals that contain a certain substring.

```JavaScript
var doc;
hdt.fromFile('./test/test.hdt')
  .then(function(hdtDocument) {
    doc = hdtDocument;
    return doc.searchLiterals('b', { offset: 0, limit: 5 });
  })
  .then(function(result) {
    console.log('Approximately ' + result.totalCount + ' literals contain the pattern.');
    result.literals.forEach(function (literal) { console.log(literal); });
    return doc.close();
  });
```

### Reading the header
HDT supports reading the header as string using `document.readHeader()`.
The example below reads the header as string, and parses the header using the [N3.js](https://github.com/RubenVerborgh/N3.js/) library.

```JavaScript
var N3 = require('n3');
var doc;
var parser = N3.Parser();
hdt.fromFile('./test/test.hdt')
  .then(function(hdtDocument) {
    doc = hdtDocument;
    return doc.readHeader();
  })
  .then(function(header) {
    var triples = [];
    return new Promise(function(resolve, reject) {
      parser.parse(header, function(error, triple) {
        if (error) return reject(error);
        if (triple) return triples.push(triple);
        resolve(triples);
      });
    });
  })
  .then(function(triples) {
    console.log('Read triples from header:\n', triples);
  })
  .catch(function(e) {
    console.error(e);
  })
```
### Changing the header
To replace header information of an HDT, use `document.changeHeader(header, toFile)`, that returns an HDT document of the output file.
The example below serializes an [N3](https://github.com/RubenVerborgh/N3.js/) triples object into an N-Triples string, and stores it in the header.

```JavaScript
var N3 = require('n3');
var doc;
var outputFile = './out.hdt';

hdt.fromFile('./test/test.hdt')
 .then(function(hdtDocument) {
   doc = hdtDocument;
   return new Promise(function(resolve, reject) {
     var writer = N3.Writer({format: 'N-Triples'});
     writer.addTriple('http://example.org/cartoons#Tom',
                      'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                      'http://example.org/cartoons#Cat');
     writer.end(function(error, triples) {
       if (error) return reject(error);
       resolve(triples);
     });
   });
 })
 .then(function(triples) {
      return doc.changeHeader(triples, outputFile);
  })
  .then(function(createdDocument) {
    return createdDocument.readHeader();
  })
  .then(function(result) {
    console.log('Wrote ' + result + ' to ' + outputFile);
  })
  .catch(function(e) {
    console.error(e);
  });
```

## Standalone utility
The standalone utility `hdt` allows you to query HDT files from the command line.
<br>
To install system-wide, execute:
```bash
sudo npm install -g hdt
```

Specify queries as follows:
```
hdt dataset.hdt --query '?s ?p ?o' --offset 200 --limit 100 --format turtle
```
Replace any of the query variables by an [IRI or literal](https://github.com/RubenVerborgh/N3.js#triple-representation) to match specific patterns.

## Build manually
To build the module from source, follow these instructions:
```Shell
git clone https://github.com/RubenVerborgh/HDT-Node.git hdt
cd hdt
git submodule init
git submodule update
npm install
npm test
```

If you make changes to the source, do the following to rebuild:
```bash
node-gyp build && npm test
```


## License

The Node.js bindings for HDT are written by [Ruben Verborgh](http://ruben.verborgh.org).

This code is copyrighted by Ruben Verborgh and released under the [GNU Lesser General Public License](http://opensource.org/licenses/LGPL-3.0).
It uses the [HDT C++ Library](https://github.com/rdfhdt/hdt-cpp), released under the same license.
