const N3 = require('n3');
const { stringQuadToQuad, stringToTerm, termToString } = require('rdf-string');

/*     Auxiliary methods for HdtDocument     */
const hdtNative = require('../build/Release/hdt');
const HdtDocumentPrototype = hdtNative.HdtDocument.prototype;
const MAX = Math.pow(2, 31) - 1;

const closedError = Promise.reject(new Error('The HDT document cannot be accessed because it is closed'));
closedError.catch(e => {});

function isValidHdtTerm(term) {
  return term && term.termType && (term.termType === 'Literal' || term.termType === 'BlankNode' || term.termType === 'NamedNode');
}

// Searches the document for triples with the given subject, predicate, and object.
HdtDocumentPrototype.searchTriples = function (subject, predicate, object, options) {
  if (this.closed) return closedError;
  if (!isValidHdtTerm(subject)) subject = null;
  if (!isValidHdtTerm(predicate)) predicate = null;
  if (!isValidHdtTerm(object)) object = null;
  options = options || {};
  const dataFactory = this.dataFactory;
  return new Promise((resolve, reject) => {
    this._searchTriples(termToString(subject) || '', termToString(predicate) || '', termToString(object) || '',
      parseOffset(options), parseLimit(options),
      (err, triples, totalCount, hasExactCount) =>
        err ? reject(err) : resolve({ triples: triples.map((t) => stringQuadToQuad(t, dataFactory)), totalCount, hasExactCount }));
  });
};

// Gives an approximate number of matches of triples with the given subject, predicate, and object.
HdtDocumentPrototype.countTriples = function (subject, predicate, object) {
  return this.search(subject, predicate, object, { offset: 0, limit: 0 });
};

// Searches the document for literals that contain the given string
HdtDocumentPrototype.searchLiterals = function (substring, options) {
  if (this.closed) return closedError;
  options = options || {};
  const dataFactory = this.dataFactory;
  return new Promise((resolve, reject) => {
    this._searchLiterals(substring,
      parseOffset(options), parseLimit(options),
      (err, literals, totalCount) =>
        err ? reject(err) : resolve({ literals: literals.map(l => stringToTerm(l, dataFactory)), totalCount }));
  });
};

// Searches terms based on a given prefix string.
const POSITIONS = {
  subject: 0,
  predicate: 1,
  object: 2,
};
HdtDocumentPrototype.searchTerms = function (options) {
  if (this.closed) return closedError;
  options = options || {};
  const limit = parseLimit(options),
      position = options.position,
      posId = POSITIONS[position],
      prefix = options.prefix || '',
      subject = isValidHdtTerm(options.subject) ? options.subject : null,
      object = isValidHdtTerm(options.object) ? options.object : null;

  // Validate parameters
  if (!(position in POSITIONS))
    return Promise.reject(new Error('Invalid position argument. Expected subject, predicate or object.'));
  if ((subject || object) && posId !== POSITIONS.predicate)
    return Promise.reject(new Error('Unsupported position argument. Expected predicate.'));

  // Return predicates that connect subject and object
  if (subject && object) {
    return this.searchTriples(subject, null, object, { limit: limit })
      .then(result => result.triples.map(statement => statement.predicate));
  }
  const dataFactory = this.dataFactory;
  // Return distinct terms
  return new Promise((resolve, reject) => {
    if ('subject' in options || 'object' in options) {
      if (!subject && !object) return resolve([]);
      this._fetchDistinctTerms(termToString(subject) || '', termToString(object) || '', limit, posId,
        (error, results) => error ? reject(error) : resolve(results.map(t => stringToTerm(t, dataFactory))));
    }
    // No subject or object values specified, so assuming we're autocompleting a term
    else {
      this._searchTerms(prefix, limit, posId,
        (error, results) => error ? reject(error) : resolve(results.map(t => stringToTerm(t, dataFactory))));
    }
  });
};

// Returns the header of the HDT document as a string.
HdtDocumentPrototype.readHeader = function () {
  if (this.closed) return closedError;
  return new Promise((resolve, reject) =>
    this._readHeader((e, header) => e ? reject(e) : resolve(header)));
};

// Replaces the current header with a new one and saves result to a new file.
HdtDocumentPrototype.changeHeader = function (header, outputFile) {
  if (this.closed) return closedError;
  return new Promise((resolve, reject) => {
    this._changeHeader(header, outputFile,
      e => e ? reject(e) : resolve(module.exports.fromFile(outputFile)));
  });
};

HdtDocumentPrototype.close = function () {
  return new Promise((resolve, reject) =>
    this._close(e => e ? reject(e) : resolve()));
};

function parseOffset({ offset }) {
  if (isNaN(offset)) return 0;
  if (offset === Infinity) return MAX;
  return Math.max(0, parseInt(offset, 10));
}

function parseLimit({ limit }) {
  if (isNaN(limit) || limit === Infinity) return MAX;
  return Math.max(0, parseInt(limit, 10));
}

// Deprecated method names
HdtDocumentPrototype.count  = HdtDocumentPrototype.countTriples;
HdtDocumentPrototype.search = HdtDocumentPrototype.searchTriples;



/*     Module exports     */

module.exports = {
  // Creates an HDT document for the given file.
  fromFile: (filename, opts) => {
    if (typeof filename !== 'string' || filename.length === 0)
      return Promise.reject(Error('Invalid filename: ' + filename));
    return new Promise((resolve, reject) => {
      hdtNative.createHdtDocument(filename, (error, document) => {
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
        document.dataFactory = opts && opts.dataFactory ? opts.dataFactory : N3.DataFactory;
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
