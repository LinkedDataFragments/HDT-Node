var hdtNative = require('./build/Release/hdt');

// An HDT document gives access to an HDT file.
function HdtDocument(filename) {
  if (typeof filename !== 'string' || filename.length === 0)
    throw new Error('Invalid filename: ' + filename);
  this._filename = filename;
}

// Searches the document for triples with the given subject, predicate, and object.
HdtDocument.prototype.search = function (subject, predicate, object, callback) {
  // Parse parameters
  if (typeof   subject !== 'string') subject   = '';
  if (typeof predicate !== 'string') predicate = '';
  if (typeof    object !== 'string') object    = '';
  if (typeof callback  !== 'function') return;

  // Search for triples matching the given pattern
  try {
    var triples = hdtNative.search(this._filename, subject, predicate, object);
    callback(null, triples);
  }
  // Parse a possible error message
  catch (error) {
    switch (error.message) {
    case 'Error opening HDT file for mapping.':
      return callback(new Error('Could not open HDT file "' + this._filename + '"'));
    case 'Non-HDT Section':
      return callback(new Error('The file "' + this._filename + '" is not a valid HDT file'));
    default:
      return callback(error);
    }
  }
};

module.exports = {
  // Creates an HDT document for the given file.
  fromFile: function (filename) { return new HdtDocument(filename); },
};
