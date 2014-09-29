var hdtNative = require('../build/Release/hdt');

// Maximum representable integer
var MAX_INTEGER = Math.pow(2, 32) - 1;

// Auxiliary functions to attach to native HdtDocument instances
var HdtDocumentPrototype = {};

// Searches the document for triples with the given subject, predicate, and object.
HdtDocumentPrototype.search = function (subject, predicate, object, options, callback) {
  if (this.closed) throw new Error('The HDT document cannot be read because it is closed');
  if (typeof  callback !== 'function') callback = options, options = {};
  if (typeof  callback !== 'function') return;
  if (typeof   subject !== 'string') subject   = '';
  if (typeof predicate !== 'string') predicate = '';
  if (typeof    object !== 'string') object    = '';
  var offset = options && options.offset ? Math.max(0, parseInt(options.offset, 10)) : 0,
      limit  = options && options.limit  ? Math.max(0, parseInt(options.limit,  10)) : MAX_INTEGER;

  return this._search(subject, predicate, object, offset, limit, callback);
};

// Gives an approximate number of matches of triples with the given subject, predicate, and object.
HdtDocumentPrototype.count = function (subject, predicate, object, callback) {
  return this.search(subject, predicate, object, { offset: 0, limit: 0 },
                     function (error, triples, totalCount) { callback(error, totalCount); });
};

module.exports = {
  // Creates an HDT document for the given file.
  fromFile: function (filename, callback) {
    if (typeof filename !== 'string' || filename.length === 0)
      return callback(Error('Invalid filename: ' + filename));
    if (typeof callback !== 'function') return;

    // Construct the native HdtDocument
    hdtNative.createHdtDocument(filename, function (error, document) {
      if (error) {
        // Parse the error message
        switch (error.message) {
        case 'Error opening HDT file for mapping.':
          return callback(Error('Could not open HDT file "' + filename + '"'));
        case 'Non-HDT Section':
          return callback(Error('The file "' + filename + '" is not a valid HDT file'));
        default:
          return callback(error);
        }
      }

      // Attach the auxiliary functions from the prototype
      for (var name in HdtDocumentPrototype)
        document[name] = HdtDocumentPrototype[name];
      callback(null, document);
    });
  },
};
