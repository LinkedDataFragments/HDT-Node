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
  var filename = this._filename;
  hdtNative.search(filename, subject, predicate, object, function (error, triples) {
    // Parse a possible error message
    if (error) {
      switch (error.message) {
      case 'Error opening HDT file for mapping.':
        return callback(new Error('Could not open HDT file "' + filename + '"'));
      case 'Non-HDT Section':
        return callback(new Error('The file "' + filename + '" is not a valid HDT file'));
      default:
        return callback(error);
      }
    }
    callback(null, triples);
  });
};

module.exports = {
  // Creates an HDT document for the given file.
  fromFile: function (filename) { return new HdtDocument(filename); },
};
