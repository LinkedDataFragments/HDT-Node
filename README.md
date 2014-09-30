# HDT for Node.js

[HDT (Header Dictionary Triples)](http://www.rdfhdt.org/) is a compressed format
for [RDF triples](http://www.w3.org/TR/2014/REC-rdf11-concepts-20140225/#data-model).
<br>
The `hdt` npm package for Node.js brings fast access to HDT files through C bindings.


## Usage

### Opening and closing an HDT document
Open an HDT document with `hdt.fromFile`,
which takes filename and callback arguments.
The HDT document will be passed to the callback.
Close the document with `close`.

```JavaScript
hdt.fromFile('./test/test.hdt', function (error, hdtDocument) {
  // Don't forget to close the document when you're done
  hdtDocument.close();
});
```

### Searching for triples matching a pattern
Search for triples with `search`,
which takes subject, predicate, object, options, and callback arguments.
Subject, predicate, and object can be IRIs or literals,
[represented as simple strings](https://github.com/RubenVerborgh/N3.js#triple-representation).
If any of these parameters is `null` or a variable, it is considered a wildcard.
Optionally, an offset and limit can be passed in an options object,
selecting only the specified subset.

The callback returns an array of triples that match the pattern.
A third parameter indicates an estimate of the total number of matching triples.

```JavaScript
hdt.fromFile('./test/test.hdt', function (error, hdtDocument) {
  hdtDocument.search('http://example.org/s1', null, null, { offset: 0, limit: 10 },
    function (error, triples, totalCount) {
      console.log('Approximately ' + totalCount + ' triples match the pattern.');
      triples.forEach(function (triple) { console.log(triple); });
      hdtDocument.close();
    });
});
```

### Counting triples matching a pattern
Retrieve an estimate of the total number of triples matching a pattern with `count`,
which takes subject, predicate, object, and callback arguments.

```JavaScript
hdt.fromFile('./test/test.hdt', function (error, hdtDocument) {
  hdtDocument.count('http://example.org/s1', null, null,
    function (error, totalCount) {
      console.log('Approximately ' + totalCount + ' triples match the pattern.');
      hdtDocument.close();
    });
});
```


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
