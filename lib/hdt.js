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
      if (err)
        reject(err);
      else
        resolve({ triples, totalCount, hasExactCount });
    });
  });
};

// Gives an approximate number of matches of triples with the given subject, predicate, and object.
HdtDocumentPrototype.countTriples = function (subject, predicate, object) {
  return this.search(subject, predicate, object, { offset: 0, limit: 0 });
};

// Searches the document for literals that contain the given string
HdtDocumentPrototype.searchLiterals = function (substring, options) {
  if (this.closed) return Promise.reject(new Error('The HDT document cannot be read because it is closed'));
  const offset = options && options.offset ? Math.max(0, parseInt(options.offset, 10)) : 0,
      limit  = options && options.limit  ? Math.max(0, parseInt(options.limit,  10)) : 0;

  return new Promise((resolve, reject) => {
    this._searchLiterals(substring, offset, limit, function (err, literals, totalCount) {
      if (err)
        return reject(err);
      else
        resolve({ literals, totalCount  });
    });
  });
};

// Searches terms based on a given prefix string.
const POSITIONS = {
  subject: 0,
  predicate: 1,
  object: 2,
};
HdtDocumentPrototype.searchTerms = function (options) {
  if (this.closed) return Promise.reject(new Error('The HDT document cannot be read because it is closed'));
  const limit = options && options.limit ? Math.max(0, parseInt(options.limit, 10)) : 100,
      position = options && options.position,
      posId = POSITIONS[position],
      prefix = options && options.prefix || '',
      filterPos = options.filter && options.filter.position,
      filterVal = options.filter && options.filter.value,
      filterPosId = POSITIONS[filterPos];
  if (!(position in POSITIONS))
    return Promise.reject(new Error('Invalid position argument. Expected subject, predicate or object.'));

  return new Promise((resolve, reject) => {
    if (options.filter) {
      if (!filterVal || filterVal === '')
        return reject(new Error('Unspecified filter value.'));
      if (filterPos !== 'object' || position !== 'predicate')
        return reject(new Error('Unsupported filter position argument.'));
      this._fetchDistinctTerms(filterVal, filterPosId, limit, posId, (error, results) => error ? reject(error) : resolve(results), this);
    }
    else {
      // No filter value specified, so assuming we're autocompleting a term
      this._searchTerms(prefix, limit, posId, (error, results) => error ? reject(error) : resolve(results), this);
    }
  });
};

// Returns the header of the HDT document as a string.
HdtDocumentPrototype.readHeader = function () {
  if (this.closed) return Promise.reject(new Error('The HDT document cannot be read because it is closed'));
  return new Promise((resolve, reject) => {
    this._readHeader((e, header) => e ? reject(e) : resolve(header));
  });
};

// Replaces the current header with a new one and saves result to a new file.
HdtDocumentPrototype.changeHeader = function (header, outputFile) {
  if (this.closed) return Promise.reject(new Error('The HDT document cannot be written because it is closed'));
  return new Promise((resolve, reject) => {
    this._changeHeader(header, outputFile,
      e => e ? reject(e) : resolve(module.exports.fromFile(outputFile)));
  });
};

HdtDocumentPrototype.close = function () {
  return new Promise((resolve, reject) => {
    this._close(function (err) {
      if (err)
        reject(err);
      else
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
            return reject(error);
          }
        }
        // Document the features of the HDT file
        document.features = Object.freeze({
          searchTriples:  true, // supported by default
          countTriples:   true, // supported by default
          searchLiterals: !!(document._features & 1),
          readHeader:     true, // supported by default
          changeHeader:   true, // supported by default
        });
        resolve(document);
      });
    });
  },
};
