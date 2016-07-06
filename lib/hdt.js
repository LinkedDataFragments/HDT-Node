var hdtNative = require('../build/Release/hdt');
var path = require('path');
/***** Auxiliary methods for HdtDocument *****/

var HdtDocumentPrototype = hdtNative.HdtDocument.prototype;

// Searches the document for triples with the given subject, predicate, and object.
HdtDocumentPrototype.searchTriples = function (subject, predicate, object, options, callback, self) {
  if (typeof  callback !== 'function') self = callback, callback = options, options = {};
  if (typeof  callback !== 'function') return;
  if (this.closed) return callback.call(self || this,
                          new Error('The HDT document cannot be read because it is closed'));
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
      callback.call(this, error, totalCount, hasExactCount); }, self);
};

// Searches the document for literals that contain the given string
HdtDocumentPrototype.searchLiterals = function (substring, options, callback, self) {
  if (typeof  callback !== 'function') self = callback, callback = options, options = {};
  if (typeof  callback !== 'function') return;
  if (this.closed) return callback.call(self || this,
                          new Error('The HDT document cannot be read because it is closed'));
  var offset = options && options.offset ? Math.max(0, parseInt(options.offset, 10)) : 0,
      limit  = options && options.limit  ? Math.max(0, parseInt(options.limit,  10)) : 0;
  this._searchLiterals(substring, offset, limit, callback, self);
};

// Deprecated method names
HdtDocumentPrototype.count  = HdtDocumentPrototype.countTriples;
HdtDocumentPrototype.search = HdtDocumentPrototype.searchTriples;



/***** Module exports *****/

module.exports = {
  // Creates an HDT document for the given file.
  loadFile: function (filename, callback, self) {
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
  fromFile: function() {
    console.warn('hdt: "fromFile" is deprecated. Use "loadFile" instead');
    module.exports.loadFile.apply(this, arguments);
  },
  generateFile: function(rdfFile, targetHdtFile, config, callback, self) {
    if (typeof callback !== 'function') return;
    if (typeof rdfFile !== 'string' || rdfFile.length === 0)
      return callback.call(self, Error('Invalid input filename: ' + rdfFile));
    if (typeof targetHdtFile !== 'string' || targetHdtFile.length === 0)
      return callback.call(self, Error('Invalid target filename: ' + targetHdtFile));
    if (config === undefined || config === null) config = {};

    //default base uri already handled by hdt lib. No need to set default
    if (config.hasOwnProperty('baseUri')) {
      if (typeof config.baseUri !== 'string') return callback.call(self, Error('Invalid base URI: ' + config.baseUri));
    } else {
      config.baseUri = '<file://' + path.resolve(rdfFile) + ">";
    }

    //default format already handled by hdt lib
    //allowed values: ntriples, nquad, n3, turtle, rdfxml
    if (config.hasOwnProperty('format')) {
      if (typeof config.format !== 'string') return callback.call(self, Error('Invalid RDF format: ' + config.format));
    } else {
      config.format = "";
    }

    if (config.hasOwnProperty('hdtSpecs')) {
      if (typeof config.hdtSpecs !== 'object') return callback.call(self, Error('HDT specs should be an object: ' + config.hdtSpecs));
    } else {
      config.hdtSpecs = {};
    }
    // Construct the native HdtDocument
    hdtNative.rdf2hdt(rdfFile, targetHdtFile, config.hdtSpecs, config.format, config.baseUri, function (error) {
      if (error) {
        switch (error.message) {
          //if needed, change some of the error msgs here
          default:
            return callback.call(self, error);
          }

      }
      module.exports.loadFile(targetHdtFile, callback, self);
    });
  }
};
