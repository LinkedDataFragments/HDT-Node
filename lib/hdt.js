var hdtNative = require('../build/Release/hdt');

// Auxiliary functions to attach to native HdtDocument instances
var HdtDocumentPrototype = {};

// Searches the document for triples with the given subject, predicate, and object.
HdtDocumentPrototype.search = function (subject, predicate, object, callback) {
  if (this.closed) throw new Error('The HDT document cannot be read because it is closed');
  if (typeof   subject !== 'string') subject   = '';
  if (typeof predicate !== 'string') predicate = '';
  if (typeof    object !== 'string') object    = '';
  if (typeof callback  !== 'function') return;

  return this._search(subject, predicate, object, callback);
};

module.exports = {
  // Creates an HDT document for the given file.
  fromFile: function (filename) {
    if (typeof filename !== 'string' || filename.length === 0)
      throw new Error('Invalid filename: ' + filename);

    // Construct the native HdtDocument
    var document;
    try { document = new hdtNative.HdtDocument(filename); }
    catch (error) {
      // Parse the error message
      switch (error.message) {
      case 'Error opening HDT file for mapping.':
        throw new Error('Could not open HDT file "' + filename + '"');
      case 'Non-HDT Section':
        throw new Error('The file "' + filename + '" is not a valid HDT file');
      default:
        throw error;
      }
    }

    // Attach the auxiliary functions from the prototype
    for (var name in HdtDocumentPrototype)
      document[name] = HdtDocumentPrototype[name];
    return document;
  },
};
