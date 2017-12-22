var hdtNative = require('../build/Release/hdt');

/*     Auxiliary methods for HdtDocument     */

var HdtDocumentPrototype = hdtNative.HdtDocument.prototype;

// Searches the document for triples with the given subject, predicate, and object.
HdtDocumentPrototype.searchTriples = function (subject, predicate, object, options) {
  if (this.closed) return Promise.reject(new Error('The HDT document cannot be read because it is closed'));
  if (typeof   subject !== 'string' ||   subject[0] === '?') subject   = '';
  if (typeof predicate !== 'string' || predicate[0] === '?') predicate = '';
  if (typeof    object !== 'string' ||    object[0] === '?') object    = '';
  const offset = options && options.offset ? Math.max(0, parseInt(options.offset, 10)) : 0,
      limit  = options && options.limit  ? Math.max(0, parseInt(options.limit,  10)) : 0;

  return new Promise((resolve, reject) => {
    this._searchTriples(subject, predicate, object, offset, limit, function (err, triples, totalCount, hasExactCount) {
      if (err) return reject(err);

      return resolve({
        triples,
        totalCount,
        hasExactCount,
      });
    }, this);
  });
};

// Gives an approximate number of matches of triples with the given subject, predicate, and object.
HdtDocumentPrototype.countTriples = function (subject, predicate, object) {
  return this.search(subject, predicate, object, { offset: 0, limit: 0 })
    .then(results => ({ totalCount: results.totalCount, hasExactCount: results.hasExactCount }));
};

// Searches the document for literals that contain the given string
HdtDocumentPrototype.searchLiterals = function (substring, options) {
  if (this.closed) return Promise.reject(new Error('The HDT document cannot be read because it is closed'));
  const offset = options && options.offset ? Math.max(0, parseInt(options.offset, 10)) : 0,
      limit  = options && options.limit  ? Math.max(0, parseInt(options.limit,  10)) : 0;

  return new Promise((resolve, reject) => {
    this._searchLiterals(substring, offset, limit, function (err, literals, totalCount) {
      if (err) return reject(err);
      resolve({
        literals,
        totalCount,
      });
    }, this);
  });
};

// Searches the document for literals that contain the given string
const POSITIONS = {
  subject: 0,
  predicate: 1,
  object: 2,
};
HdtDocumentPrototype.searchTerms = function (options) {
  if (this.closed) return Promise.reject(new Error('The HDT document cannot be read because it is closed'));
  const limit = options && options.limit ? Math.max(0, parseInt(options.limit, 10)) : 100;
  const position = options && options.position;
  const prefix = options && options.prefix || '';
  const posId = POSITIONS[position];
  if (!(position in POSITIONS))
    return Promise.reject(new Error('Invalid position argument. Expected subject, predicate or object.'));
  return new Promise((resolve, reject) => {
    this._searchTerms(prefix, limit, posId, (error, results) => {
      if (error) return reject(error);
      resolve(results);
    }, this);
  });
};
HdtDocumentPrototype.close = function () {
  return new Promise((resolve, reject) => {
    this._close(function (e) {
      if (e) return reject(e);
      resolve();
    });
  });
};

// Deprecated method names
HdtDocumentPrototype.count  = HdtDocumentPrototype.countTriples;
HdtDocumentPrototype.search = HdtDocumentPrototype.searchTriples;



/*     Module exports     */

module.exports = {
  // Creates an HDT document for the given file.
  fromFile: function (filename) {
    if (typeof filename !== 'string' || filename.length === 0)
      return Promise.reject(Error('Invalid filename: ' + filename));

    return new Promise((resolve, reject) => {
      hdtNative.createHdtDocument(filename, function (error, document) {
        // Abort the creation if any error occurred
        if (error) {
          switch (error.message) {
          case 'Error opening HDT file for mapping.':
            return reject(new Error('Could not open HDT file "' + filename + '"'));
          case 'Non-HDT Section':
            return reject(new Error('The file "' + filename + '" is not a valid HDT file'));
          default:
            reject(error);
          }
        }
        // Document the features of the HDT file
        document.features = Object.freeze({
          searchTriples:  true, // supported by default
          countTriples:   true, // supported by default
          searchLiterals: !!(document._features & 1),
        });
        resolve(document);
      });
    });
  },
};
