#include <node.h>
#include <nan.h>
#include <assert.h>
#include <set>
#include <vector>
#include <HDTEnums.hpp>
#include <HDTManager.hpp>
#include <HDTVocabulary.hpp>
#include <LiteralDictionary.hpp>
#include "HdtDocument.h"
#include "../deps/libhdt/src/util/fileUtil.hpp"

using namespace v8;
using namespace hdt;



/******** Construction and destruction ********/


// Creates a new HDT document.
HdtDocument::HdtDocument(const Local<Object>& handle, HDT* hdt) : hdt(hdt), features(0) {
  this->Wrap(handle);
  // Determine supported features
  if (hdt->getDictionary()->getType() == HDTVocabulary::DICTIONARY_TYPE_LITERAL)
    features |= LiteralSearch;
}

// Deletes the HDT document.
HdtDocument::~HdtDocument() { Destroy(); }

// Destroys the document, disabling all further operations.
void HdtDocument::Destroy() {
  if (hdt) {
    delete hdt;
    hdt = NULL;
  }
}

// Constructs a JavaScript wrapper for an HDT document.
NAN_METHOD(HdtDocument::New) {
  assert(info.IsConstructCall());
  info.GetReturnValue().Set(info.This());
}

// Returns the constructor of HdtDocument.
Nan::Persistent<Function> constructor;
const Nan::Persistent<Function>& HdtDocument::GetConstructor() {
  if (constructor.IsEmpty()) {
    // Create constructor template
    Local<FunctionTemplate> constructorTemplate = Nan::New<FunctionTemplate>(New);
    constructorTemplate->SetClassName(Nan::New("HdtDocument").ToLocalChecked());
    constructorTemplate->InstanceTemplate()->SetInternalFieldCount(1);
    // Create prototype
    Nan::SetPrototypeMethod(constructorTemplate, "_searchTriples",  SearchTriples);
    Nan::SetPrototypeMethod(constructorTemplate, "_searchLiterals", SearchLiterals);
    Nan::SetPrototypeMethod(constructorTemplate, "_searchTerms",    SearchTerms);
    Nan::SetPrototypeMethod(constructorTemplate, "_readHeader",     ReadHeader);
    Nan::SetPrototypeMethod(constructorTemplate, "_writeHeader",    WriteHeader);
    Nan::SetPrototypeMethod(constructorTemplate, "_close",          Close);
    Nan::SetAccessor(constructorTemplate->PrototypeTemplate(),
                     Nan::New("_features").ToLocalChecked(), Features);
    Nan::SetAccessor(constructorTemplate->PrototypeTemplate(),
                     Nan::New("closed").ToLocalChecked(), Closed);
    // Set constructor
    constructor.Reset(constructorTemplate->GetFunction());
  }
  return constructor;
}



/******** createHdtDocument ********/

class CreateWorker : public Nan::AsyncWorker {
  string filename;
  HDT* hdt;

public:
  CreateWorker(const char* filename, Nan::Callback *callback)
    : Nan::AsyncWorker(callback), filename(filename), hdt(NULL) { };

  void Execute() {
    try { hdt = HDTManager::mapIndexedHDT(filename.c_str()); }
    catch (const runtime_error error) { SetErrorMessage(error.what()); }
  }

  void HandleOKCallback() {
    Nan::HandleScope scope;
    // Create a new HdtDocument
    Local<Object> newDocument = Nan::NewInstance(Nan::New(HdtDocument::GetConstructor())).ToLocalChecked();
    new HdtDocument(newDocument, hdt);
    // Send the new HdtDocument through the callback
    const unsigned argc = 2;
    Local<Value> argv[argc] = { Nan::Null(), newDocument };
    callback->Call(argc, argv);
  }
};

// Creates a new instance of HdtDocument.
// JavaScript signature: createHdtDocument(filename, callback)
NAN_METHOD(HdtDocument::Create) {
  assert(info.Length() == 2);
  Nan::AsyncQueueWorker(new CreateWorker(*Nan::Utf8String(info[0]),
                                         new Nan::Callback(info[1].As<Function>())));
}



/******** HdtDocument#_searchTriples ********/

class SearchTriplesWorker : public Nan::AsyncWorker {
  HdtDocument* document;
  // JavaScript function arguments
  string subject, predicate, object;
  uint32_t offset, limit;
  Persistent<Object> self;
  // Callback return values
  vector<TripleID> triples;
  map<unsigned int, string> subjects, predicates, objects;
  uint32_t totalCount;
  bool hasExactCount;

public:
  SearchTriplesWorker(HdtDocument* document, char* subject, char* predicate, char* object,
                      uint32_t offset, uint32_t limit, Nan::Callback* callback, Local<Object> self)
    : Nan::AsyncWorker(callback),
      document(document), subject(subject), predicate(predicate), object(object),
      offset(offset), limit(limit), totalCount(0) {
    SaveToPersistent("self", self);
  };

  void Execute() {
    IteratorTripleID* it = NULL;
    try {
      // Prepare the triple pattern
      Dictionary* dict = document->GetHDT()->getDictionary();
      TripleString triple(subject, predicate, toHdtLiteral(object));
      TripleID tripleId;
      dict->tripleStringtoTripleID(triple, tripleId);
      // If any of the components does not exist, there are no matches
      if ((subject[0]   && !tripleId.getSubject())   ||
          (predicate[0] && !tripleId.getPredicate()) ||
          (object[0]    && !tripleId.getObject())) {
        hasExactCount = true;
        return;
      }

      // Estimate the total number of triples
      it = document->GetHDT()->getTriples()->search(tripleId);
      totalCount = it->estimatedNumResults();
      hasExactCount = it->numResultEstimation() == EXACT;

      // Go to the right offset
      if (it->canGoTo())
        try { it->skip(offset), offset = 0; }
        catch (const runtime_error error) { /* invalid offset */ }
      else
        while (offset && it->hasNext()) it->next(), offset--;

      // Add matching triples to the result vector
      if (!offset) {
        while (it->hasNext() && (!limit || triples.size() < limit)) {
          TripleID& triple = *it->next();
          triples.push_back(triple);
          if (!subjects.count(triple.getSubject())) {
            subjects[triple.getSubject()] = dict->idToString(triple.getSubject(), SUBJECT);
          }
          if (!predicates.count(triple.getPredicate())) {
            predicates[triple.getPredicate()] = dict->idToString(triple.getPredicate(), PREDICATE);
          }
          if (!objects.count(triple.getObject())) {
            string object(dict->idToString(triple.getObject(), OBJECT));
            objects[triple.getObject()] = fromHdtLiteral(object);
          }
        }
      }
    }
    catch (const runtime_error error) { SetErrorMessage(error.what()); }
    if (it)
      delete it;
  }

  void HandleOKCallback() {
    Nan::HandleScope scope;
    // Convert the triple components into strings
    map<unsigned int, string>::const_iterator it;
    map<unsigned int, Local<String> > subjectStrings, predicateStrings, objectStrings;
    for (it = subjects.begin(); it != subjects.end(); it++)
      subjectStrings[it->first] = Nan::New(it->second.c_str()).ToLocalChecked();
    for (it = predicates.begin(); it != predicates.end(); it++)
      predicateStrings[it->first] = Nan::New(it->second.c_str()).ToLocalChecked();
    for (it = objects.begin(); it != objects.end(); it++)
      objectStrings[it->first] = Nan::New(it->second.c_str()).ToLocalChecked();

    // Convert the triples into a JavaScript object array
    uint32_t count = 0;
    Local<Array> triplesArray = Nan::New<Array>(triples.size());
    const Local<String> SUBJECT   = Nan::New("subject").ToLocalChecked();
    const Local<String> PREDICATE = Nan::New("predicate").ToLocalChecked();
    const Local<String> OBJECT    = Nan::New("object").ToLocalChecked();
    for (vector<TripleID>::const_iterator it = triples.begin(); it != triples.end(); it++) {
      Local<Object> tripleObject = Nan::New<Object>();
      tripleObject->Set(SUBJECT, subjectStrings[it->getSubject()]);
      tripleObject->Set(PREDICATE, predicateStrings[it->getPredicate()]);
      tripleObject->Set(OBJECT, objectStrings[it->getObject()]);
      triplesArray->Set(count++, tripleObject);
    }

    // Send the JavaScript array and estimated total count through the callback
    const unsigned argc = 4;
    Local<Value> argv[argc] = { Nan::Null(), triplesArray,
                                Nan::New<Integer>((uint32_t)totalCount),
                                Nan::New<Boolean>((bool)hasExactCount) };
    callback->Call(GetFromPersistent("self")->ToObject(), argc, argv);
  }

  void HandleErrorCallback() {
    Nan::HandleScope scope;
    Local<Value> argv[] = { Exception::Error(Nan::New(ErrorMessage()).ToLocalChecked()) };
    callback->Call(GetFromPersistent("self")->ToObject(), 1, argv);
  }
};

// Searches for a triple pattern in the document.
// JavaScript signature: HdtDocument#_searchTriples(subject, predicate, object, offset, limit, callback)
NAN_METHOD(HdtDocument::SearchTriples) {
  assert(info.Length() == 7);
  Nan::AsyncQueueWorker(new SearchTriplesWorker(Unwrap<HdtDocument>(info.This()),
    *Nan::Utf8String(info[0]), *Nan::Utf8String(info[1]), *Nan::Utf8String(info[2]),
    info[3]->Uint32Value(), info[4]->Uint32Value(),
    new Nan::Callback(info[5].As<Function>()),
    info[6]->IsObject() ? info[6].As<Object>() : info.This()));
}



/******** HdtDocument#_searchLiterals ********/

class SearchLiteralsWorker : public Nan::AsyncWorker {
  HdtDocument* document;
  // JavaScript function arguments
  string substring;
  uint32_t offset, limit;
  Persistent<Object> self;
  // Callback return values
  vector<string> literals;
  uint32_t totalCount;

public:
  SearchLiteralsWorker(HdtDocument* document, char* substring, uint32_t offset, uint32_t limit,
                       Nan::Callback* callback, Local<Object> self)
    : Nan::AsyncWorker(callback), document(document),
      substring(substring), offset(offset), limit(limit), totalCount(0) {
    SaveToPersistent("self", self);
  };

  void Execute() {
    if (!document->Supports(LiteralSearch)) {
      SetErrorMessage("The HDT document does not support literal search");
      return;
    }

    uint32_t* literalIds = NULL;
    try {
      // Find matching literal IDs
      LiteralDictionary *dict = (LiteralDictionary*)(document->GetHDT()->getDictionary());
      uint32_t  literalCount = 0;
      totalCount = dict->substringToId((unsigned char*)substring.c_str(), substring.length(),
                                       offset, limit, false, &literalIds, &literalCount);

      // Convert the literal IDs to strings
      for (uint32_t *id = literalIds, *end = literalIds + literalCount; id != end; id++) {
        string literal(dict->idToString(*id, OBJECT));
        literals.push_back(fromHdtLiteral(literal));
      }
    }
    catch (const runtime_error error) { SetErrorMessage(error.what()); }
    if (literalIds)
      delete[] literalIds;
  }

  void HandleOKCallback() {
    Nan::HandleScope scope;
    // Convert the literals into a JavaScript array
    uint32_t count = 0;
    Local<Array> literalsArray = Nan::New<Array>(literals.size());
    for (vector<string>::const_iterator it = literals.begin(); it != literals.end(); it++)
      Nan::Set(literalsArray, count++, Nan::New(*it).ToLocalChecked());

    // Send the JavaScript array and estimated total count through the callback
    const unsigned argc = 4;
    Local<Value> argv[argc] = { Nan::Null(), literalsArray,
                                Nan::New<Integer>((uint32_t)totalCount),
                                Nan::New<Boolean>(true) };
    callback->Call(GetFromPersistent("self")->ToObject(), argc, argv);
  }

  void HandleErrorCallback() {
    Nan::HandleScope scope;
    Local<Value> argv[] = { Exception::Error(Nan::New(ErrorMessage()).ToLocalChecked()) };
    callback->Call(GetFromPersistent("self")->ToObject(), 1, argv);
  }
};

// Searches for a triple pattern in the document.
// JavaScript signature: HdtDocument#_searchLiterals(substring, offset, limit, callback, self)
NAN_METHOD(HdtDocument::SearchLiterals) {
  assert(info.Length() == 5);
  Nan::AsyncQueueWorker(new SearchLiteralsWorker(Unwrap<HdtDocument>(info.This()),
    *Nan::Utf8String(info[0]), info[1]->Uint32Value(), info[2]->Uint32Value(),
    new Nan::Callback(info[3].As<Function>()),
    info[4]->IsObject() ? info[4].As<Object>() : info.This()));
}

/******** HdtDocument#_SearchTerms ********/

class SearchTermsWorker : public Nan::AsyncWorker {
  HdtDocument* document;
  // JavaScript function arguments
  string base;
  uint32_t limit;
  hdt::TripleComponentRole position;
  Persistent<Object> self;
  // Callback return values
  vector<string> suggestions;
public:
  SearchTermsWorker(HdtDocument* document, char* base, uint32_t limit, uint32_t posId, Nan::Callback* callback,
                    Local<Object> self)
    : Nan::AsyncWorker(callback),
      document(document), base(base), limit(limit), position((TripleComponentRole) posId) {
        SaveToPersistent("self", self);
      };

  void Execute() {
    try {
      Dictionary* dict = document->GetHDT()->getDictionary();
      dict->getSuggestions((char *) base.c_str(), position, suggestions, limit);
    }
    catch (const runtime_error error) { SetErrorMessage(error.what()); }
  }

  void HandleOKCallback() {
    Nan::HandleScope scope;
    // Convert the suggestions into a JavaScript array
    uint32_t count = 0;
    Local<Array> suggestionsArray = Nan::New<Array>(suggestions.size());
    for (vector<string>::const_iterator it = suggestions.begin(); it != suggestions.end(); it++)
      Nan::Set(suggestionsArray, count++, Nan::New(*it).ToLocalChecked());

    // Send the JavaScript array and estimated total count through the callback
    const unsigned argc = 2;
    Local<Value> argv[argc] = { Nan::Null(), suggestionsArray};
    callback->Call(GetFromPersistent("self")->ToObject(), argc, argv);
  }

  void HandleErrorCallback() {
    Nan::HandleScope scope;
    Local<Value> argv[] = { Exception::Error(Nan::New(ErrorMessage()).ToLocalChecked()) };
    callback->Call(GetFromPersistent("self")->ToObject(), 1, argv);
  }
};

// Searches terms based on a given string over a specific position.
// JavaScript signature: HdtDocument#_SearchTerms(string, limit, position, callback)
NAN_METHOD(HdtDocument::SearchTerms) {
  assert(info.Length() == 5);
  Nan::AsyncQueueWorker(new SearchTermsWorker(Unwrap<HdtDocument>(info.This()),
    *Nan::Utf8String(info[0]), info[1]->Uint32Value(), info[2]->Uint32Value(),
    new Nan::Callback(info[3].As<Function>()),
    info[4]->IsObject() ? info[4].As<Object>() : info.This()));
}

/******** HdtDocument#_readHeader ********/

class ReadHeaderWorker : public Nan::AsyncWorker {
  HdtDocument* document;
  // JavaScript function arguments
  Persistent<Object> self;
  // Callback return values
  string headerString;
  uint32_t totalCount;

public:
  ReadHeaderWorker(HdtDocument* document, Nan::Callback* callback, Local<Object> self)
    : Nan::AsyncWorker(callback), document(document), headerString(""), totalCount(0) {
        SaveToPersistent("self", self);
    };

  void Execute() {
    IteratorTripleString *it = NULL;
    try {

      Header *header = document->GetHDT()->getHeader();
      IteratorTripleString *it = header->search("","","");

      // Create header string.
      while(it->hasNext()) {
        TripleString *ts = it->next();
        headerString += ts->getSubject();
        headerString += " ";
        headerString += ts->getPredicate();
        headerString += " ";
        headerString += ts->getObject();
        headerString += " .\n";
        totalCount++;
  		}
    }
    catch (const runtime_error error) { SetErrorMessage(error.what()); }
    if (it)
      delete it;
  }

  void HandleOKCallback() {
    Nan::HandleScope scope;

    // Convert header string to Local<String>.
    Local<String> nanHeader = Nan::New(headerString).ToLocalChecked();

    // Send the header git string and total count through the callback.
    const unsigned argc = 3;
    Local<Value> argv[argc] = { Nan::Null(), nanHeader,
                                Nan::New<Integer>((uint32_t)totalCount)};
    callback->Call(GetFromPersistent("self")->ToObject(), argc, argv);
  }

  void HandleErrorCallback() {
    Nan::HandleScope scope;
    Local<Value> argv[] = { Exception::Error(Nan::New(ErrorMessage()).ToLocalChecked()) };
    callback->Call(GetFromPersistent("self")->ToObject(), 1, argv);
  }
};

// Returns the header of the hdt document as a string.
// JavaScript signature: HdtDocument#_readHeader(callback, self)
NAN_METHOD(HdtDocument::ReadHeader) {
  assert(info.Length() == 2);
  Nan::AsyncQueueWorker(new ReadHeaderWorker(Unwrap<HdtDocument>(info.This()),
    new Nan::Callback(info[0].As<Function>()),
    info[1]->IsObject() ? info[1].As<Object>() : info.This()));
}

/******** HdtDocument#_writeHeader ********/

class WriteHeaderWorker : public Nan::AsyncWorker {
  HdtDocument* document;
  // JavaScript function arguments
  Persistent<Object> self;
  string headerString;
  string fileName;

public:
  WriteHeaderWorker(HdtDocument* document, string headerString, string fileName,
                    Nan::Callback* callback, Local<Object> self)
    : Nan::AsyncWorker(callback), document(document),
      headerString(headerString), fileName(fileName) {
        SaveToPersistent("self", self);
    };

  void Execute() {
    try {
      // Get and clear current header.
      Header *header = document->GetHDT()->getHeader();
      header->clear();

      // Replace header.
      istringstream in(headerString, ios::binary);
  		ControlInformation ci;
  		ci.setFormat(HDTVocabulary::HEADER_NTRIPLES);
  		ci.setUint("length", fileUtil::getSize(in));
  		header->load(in, ci);

      // Save
  		document->GetHDT()->saveToHDT(this->fileName.c_str());
    }
    catch (const runtime_error error) { SetErrorMessage(error.what()); }
  }

  void HandleOKCallback() {
    Nan::HandleScope scope;
    const unsigned argc = 1;
    Local<Value> argv[argc] = { Nan::Null() };
    callback->Call(GetFromPersistent("self")->ToObject(), 1, argv);
  }

  void HandleErrorCallback() {
    Nan::HandleScope scope;
    Local<Value> argv[] = { Exception::Error(Nan::New(ErrorMessage()).ToLocalChecked()) };
    callback->Call(GetFromPersistent("self")->ToObject(), 1, argv);
  }
};

// Replaces the current header with a new one.
// JavaScript signature: HdtDocument#_writeHeader(header, filename, callback, self)
NAN_METHOD(HdtDocument::WriteHeader) {
  assert(info.Length() == 4);

  Nan::AsyncQueueWorker(new WriteHeaderWorker(Unwrap<HdtDocument>(info.This()),
    *Nan::Utf8String(info[0]), *Nan::Utf8String(info[1]),
    new Nan::Callback(info[2].As<Function>()),
    info[3]->IsObject() ? info[3].As<Object>() : info.This()));
}

/******** HdtDocument#features ********/


// Gets a bitvector indicating the supported features.
NAN_PROPERTY_GETTER(HdtDocument::Features) {
  HdtDocument* hdtDocument = Unwrap<HdtDocument>(info.This());
  info.GetReturnValue().Set(Nan::New<Integer>(hdtDocument->features));
}



/******** HdtDocument#close ********/

// Closes the document, disabling all further operations.
// JavaScript signature: HdtDocument#close([callback], [self])
NAN_METHOD(HdtDocument::Close) {
  // Destroy the current document
  HdtDocument* hdtDocument = Unwrap<HdtDocument>(info.This());
  hdtDocument->Destroy();

  // Call the callback if one was passed
  if (info.Length() >= 1 && info[0]->IsFunction()) {
    const Local<Function> callback = info[0].As<Function>();
    const Local<Object> self = info.Length() >= 2 && info[1]->IsObject() ?
                               info[1].As<Object>() : Nan::GetCurrentContext()->Global();
    const unsigned argc = 1;
    Handle<Value> argv[argc] = { Nan::Null() };
    callback->Call(self, argc, argv);
  }
}



/******** HdtDocument#closed ********/


// Gets a boolean indicating whether the document is closed.
NAN_PROPERTY_GETTER(HdtDocument::Closed) {
  HdtDocument* hdtDocument = Unwrap<HdtDocument>(info.This());
  info.GetReturnValue().Set(Nan::New<Boolean>(!hdtDocument->hdt));
}



/******** Utility functions ********/


// The JavaScript representation for a literal with a datatype is
//   "literal"^^http://example.org/datatype
// whereas the HDT representation is
//   "literal"^^<http://example.org/datatype>
// The functions below convert when needed.


// Converts a JavaScript literal to an HDT literal
string& toHdtLiteral(string& literal) {
  // Check if the object is a literal with a datatype, which needs conversion
  string::const_iterator obj;
  string::iterator objLast;
  if (*(obj = literal.begin()) == '"' && *(objLast = literal.end() - 1) != '"') {
    // If the start of a datatype was found, surround it with angular brackets
    string::const_iterator datatype = objLast;
    while (obj != --datatype && *datatype != '@' && *datatype != '^');
    if (*datatype == '^') {
      // Allocate space for brackets, and update iterators
      literal.resize(literal.length() + 2);
      datatype += (literal.begin() - obj) + 1;
      objLast = literal.end() - 1;
      // Add brackets
      *objLast = '>';
      while (--objLast != datatype)
        *objLast = *(objLast - 1);
      *objLast = '<';
    }
  }
  return literal;
}

// Converts an HDT literal to a JavaScript literal
string& fromHdtLiteral(string& literal) {
  // Check if the literal has a datatype, which needs conversion
  string::const_iterator obj;
  string::iterator objLast;
  if (*(obj = literal.begin()) == '"' && *(objLast = literal.end() - 1) == '>') {
    // Find the start of the datatype
    string::iterator datatype = objLast;
    while (obj != --datatype && *datatype != '<');
    // Change the datatype representation by removing angular brackets
    if (*datatype == '<')
      literal.erase(datatype), literal.erase(objLast - 1);
  }
  return literal;
}
