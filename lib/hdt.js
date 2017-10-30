var hdtNative = require('../build/Release/hdt');

/*     Auxiliary methods for HdtDocument     */

var HdtDocumentPrototype = hdtNative.HdtDocument.prototype;

// Searches the document for triples with the given subject, predicate, and object.
HdtDocumentPrototype.searchTriples = function (subject, predicate, object, options, callback, self) {
  if (typeof  callback !== 'function') self = callback, callback = options, options = {};
  if (typeof  callback !== 'function') return;
  if (this.closed) return callback.call(self || this, new Error('The HDT document cannot be read because it is closed'));
  if (typeof   subject !== 'string' ||   subject[0] === '?') subject   = '';
  if (typeof predicate !== 'string' || predicate[0] === '?') predicate = '';
  if (typeof    object !== 'string' ||    object[0] === '?') object    = '';
  var offset = options && options.offset ? Math.max(0, parseInt(options.offset, 10)) : 0,
      limit  = options && options.limit  ? Math.max(0, parseInt(options.limit,  10)) : 0;

  this._searchTriples(subject, predicate, object, offset, limit, callback, self);
};

// Gives an approximate number of matches of triples with the given subject, predicate, and object.
HdtDocumentPrototype.countTriples = function (subject, predicate, object, callback, self) {
  this.search(subject, predicate, object, { offset: 0, limit: 0 },
              function (error, triples, totalCount, hasExactCount) {
                callback.call(this, error, totalCount, hasExactCount);
              }, self);
};

// Searches the document for literals that contain the given string
HdtDocumentPrototype.searchLiterals = function (substring, options, callback, self) {
  if (typeof  callback !== 'function') self = callback, callback = options, options = {};
  if (typeof  callback !== 'function') return;
  if (this.closed) return callback.call(self || this, new Error('The HDT document cannot be read because it is closed'));
  var offset = options && options.offset ? Math.max(0, parseInt(options.offset, 10)) : 0,
      limit  = options && options.limit  ? Math.max(0, parseInt(options.limit,  10)) : 0;
  this._searchLiterals(substring, offset, limit, callback, self);
};


// Searches the document for literals that contain the given string
HdtDocumentPrototype.findTerms = function (options, callback, self) {
  if (typeof  callback !== 'function') return;
  if (this.closed) return callback.call(self || this, new Error('The HDT document cannot be read because it is closed'));
  var limit  = options && options.limit  ? Math.max(0, parseInt(options.limit,  10)) : 100;
  var position = options && options.position  ? options.position.toLowerCase() : undefined;
  var prefix = options && options.prefix ? options.prefix : '';
  var posId;
  switch (position) {
  case 'subject': posId = 0; break;
  case 'predicate': posId = 1; break;
  case 'object': posId = 2; break;
  default:
    return callback.call(self || this, new Error('Invalid position argument. Expected subject, predicate or object.'));
  }
  this._findTerms(prefix, limit, posId, callback, self);
};

// Deprecated method names
HdtDocumentPrototype.count  = HdtDocumentPrototype.countTriples;
HdtDocumentPrototype.search = HdtDocumentPrototype.searchTriples;



/*     Module exports     */

module.exports = {
  // Creates an HDT document for the given file.
  fromFile: function (filename, callback, self) {
    if (typeof callback !== 'function') return;
    if (typeof filename !== 'string' || filename.length === 0)
      return callback.call(self, Error('Invalid filename: ' + filename));

    // Construct the native HdtDocument
    hdtNative.createHdtDocument(filename, function (error, document) {
      // Abort the creation if any error occurred
      if (error) {
        switch (error.message) {
        case 'Error opening HDT file for mapping.':
          return callback.call(self, Error('Could not open HDT file "' + filename + '"'));
        case 'Non-HDT Section':
          return callback.call(self, Error('The file "' + filename + '" is not a valid HDT file'));
        default:
          return callback.call(self, error);
        }
      }
      // Document the features of the HDT file
      document.features = Object.freeze({
        searchTriples:  true, // supported by default
        countTriples:   true, // supported by default
        searchLiterals: !!(document._features & 1),
      });
      callback.call(self, null, document);
    });
  },
};
