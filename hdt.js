var hdtNative = require('./build/Release/hdt');

// An HDT document gives access to an HDT file.
function HdtDocument(filename) {
  if (typeof filename !== 'string' || filename.length === 0)
    throw new Error('Invalid filename: ' + filename);
  this._filename = filename;
}

// Searches the document for triples with the given subject, predicate, and object.
HdtDocument.prototype.search = function (subject, predicate, object) {
  // Parse parameters
  if (typeof   subject !== 'string') subject   = '';
  if (typeof predicate !== 'string') predicate = '';
  if (typeof    object !== 'string') object    = '';

  // Search for triples matching the given pattern
  try {
    return hdtNative.search(this._filename, subject, predicate, object);
  }
  // Parse a possible error message
  catch (error) {
    switch (error.message) {
    case 'Error opening HDT file for mapping.':
      throw new Error('Could not open HDT file "' + this._filename + '"');
    case 'Non-HDT Section':
      throw new Error('The file "' + this._filename + '" is not a valid HDT file');
    default:
      throw error;
    }
  }
};

module.exports = {
  // Creates an HDT document for the given file.
  fromFile: function (filename) { return new HdtDocument(filename); },
};
