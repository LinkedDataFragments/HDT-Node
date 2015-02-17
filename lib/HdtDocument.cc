#include <node.h>
#include <nan.h>
#include <assert.h>
#include <set>
#include <vector>
#include <HDTManager.hpp>
#include <HDTVocabulary.hpp>
#include <LiteralDictionary.hpp>
#include "HdtDocument.h"

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
  NanScope();
  assert(args.IsConstructCall());
  NanReturnValue(args.This());
}

// Returns the constructor of HdtDocument.
Persistent<Function> constructor;
const Persistent<Function>& HdtDocument::GetConstructor() {
  if (constructor.IsEmpty()) {
    // Create constructor template
    Local<FunctionTemplate> constructorTemplate = NanNew<FunctionTemplate>(New);
    constructorTemplate->SetClassName(NanNew<String>("HdtDocument"));
    constructorTemplate->InstanceTemplate()->SetInternalFieldCount(1);
    // Create prototype
    Local<ObjectTemplate> prototypeTemplate = constructorTemplate->PrototypeTemplate();
    prototypeTemplate->Set(NanNew<String>("_searchTriples"),
                           NanNew<FunctionTemplate>(SearchTriples)->GetFunction());
    prototypeTemplate->Set(NanNew<String>("_searchLiterals"),
                           NanNew<FunctionTemplate>(SearchLiterals)->GetFunction());
    prototypeTemplate->Set(NanNew<String>("close"),
                           NanNew<FunctionTemplate>(Close) ->GetFunction());
    prototypeTemplate->SetAccessor(NanNew<String>("closed"), Closed, NULL);
    NanAssignPersistent(constructor, constructorTemplate->GetFunction());
  }
  return constructor;
}



/******** createHdtDocument ********/

class CreateWorker : public NanAsyncWorker {
  string filename;
  HDT* hdt;

public:
  CreateWorker(const char* filename, NanCallback *callback)
    : NanAsyncWorker(callback), filename(filename), hdt(NULL) { };

  void Execute() {
    try { hdt = HDTManager::mapIndexedHDT(filename.c_str()); }
    catch (const char* error) { SetErrorMessage(error); }
  }

  void HandleOKCallback() {
    NanScope();
    // Create a new HdtDocument
    Local<Object> newDocument = NanNew(HdtDocument::GetConstructor())->NewInstance();
    new HdtDocument(newDocument, hdt);
    // Send the new HdtDocument through the callback
    const unsigned argc = 2;
    Handle<Value> argv[argc] = { NanNull(), newDocument };
    callback->Call(argc, argv);
  }
};

// Creates a new instance of HdtDocument.
// JavaScript signature: createHdtDocument(filename, callback)
NAN_METHOD(HdtDocument::Create) {
  NanScope();
  assert(args.Length() == 2);
  NanAsyncQueueWorker(new CreateWorker(*NanUtf8String(args[0]),
                                       new NanCallback(args[1].As<Function>())));
  NanReturnUndefined();
}



/******** HdtDocument#_searchTriples ********/

class SearchTriplesWorker : public NanAsyncWorker {
  HdtDocument* document;
  // JavaScript function arguments
  string subject, predicate, object;
  uint32_t offset, limit;
  Persistent<Object> self;
  // Callback return values
  vector<TripleID> triples;
  map<unsigned int, string> subjects, predicates, objects;
  uint32_t totalCount;

public:
  SearchTriplesWorker(HdtDocument* document, char* subject, char* predicate, char* object,
                      uint32_t offset, uint32_t limit, NanCallback* callback, Local<Object> self)
    : NanAsyncWorker(callback),
      document(document), subject(subject), predicate(predicate), object(object),
      offset(offset), limit(limit), totalCount(0) {
    SaveToPersistent("self", self);
  };

  void Execute() {
    // Prepare the triple pattern
    Dictionary* dict = document->GetHDT()->getDictionary();
    TripleString triple(subject, predicate, toHdtLiteral(object));
    TripleID tripleId;
    dict->tripleStringtoTripleID(triple, tripleId);
    if ((subject[0]   && !tripleId.getSubject())   ||
        (predicate[0] && !tripleId.getPredicate()) ||
        (object[0]    && !tripleId.getObject()))   return;

    // Estimate the total number of triples
    IteratorTripleID* it = document->GetHDT()->getTriples()->search(tripleId);
    totalCount = it->estimatedNumResults();

    // Go to the right offset
    if (it->canGoTo())
      try { it->goTo(offset), offset = 0; }
      catch (char const* error) { /* invalid offset */ }
    else
      while (offset && it->hasNext()) it->next(), offset--;

    // Add matching triples to the result vector
    if (!offset) {
      while (limit-- && it->hasNext()) {
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
    delete it;
  }

  void HandleOKCallback() {
    NanScope();
    // Convert the triple components into strings
    map<unsigned int, string>::const_iterator it;
    map<unsigned int, Local<String> > subjectStrings, predicateStrings, objectStrings;
    for (it = subjects.begin(); it != subjects.end(); it++)
      subjectStrings[it->first] = NanNew<String>(it->second.c_str());
    for (it = predicates.begin(); it != predicates.end(); it++)
      predicateStrings[it->first] = NanNew<String>(it->second.c_str());
    for (it = objects.begin(); it != objects.end(); it++)
      objectStrings[it->first] = NanNew<String>(it->second.c_str());

    // Convert the triples into a JavaScript object array
    uint32_t count = 0;
    Local<Array> triplesArray = NanNew<Array>(triples.size());
    const Local<String> SUBJECT   = NanNew<String>("subject");
    const Local<String> PREDICATE = NanNew<String>("predicate");
    const Local<String> OBJECT    = NanNew<String>("object");
    for (vector<TripleID>::const_iterator it = triples.begin(); it != triples.end(); it++) {
      Local<Object> tripleObject = NanNew<Object>();
      tripleObject->Set(SUBJECT, subjectStrings[it->getSubject()]);
      tripleObject->Set(PREDICATE, predicateStrings[it->getPredicate()]);
      tripleObject->Set(OBJECT, objectStrings[it->getObject()]);
      triplesArray->Set(count++, tripleObject);
    }

    // Send the JavaScript array and estimated total count through the callback
    const unsigned argc = 3;
    Handle<Value> argv[argc] = { NanNull(), triplesArray, NanNew<Integer>((uint32_t)totalCount) };
    callback->Call(GetFromPersistent("self"), argc, argv);
  }

  void HandleErrorCallback() {
    NanScope();
    Local<Value> argv[] = { Exception::Error(NanNew<String>(ErrorMessage())) };
    callback->Call(GetFromPersistent("self"), 1, argv);
  }
};

// Searches for a triple pattern in the document.
// JavaScript signature: HdtDocument#_searchTriples(subject, predicate, object, offset, limit, callback)
NAN_METHOD(HdtDocument::SearchTriples) {
  NanScope();
  assert(args.Length() == 7);

  // Create asynchronous task
  NanAsyncQueueWorker(new SearchTriplesWorker(Unwrap<HdtDocument>(args.This()),
    *NanUtf8String(args[0]), *NanUtf8String(args[1]), *NanUtf8String(args[2]),
    args[3]->Uint32Value(), args[4]->Uint32Value(),
    new NanCallback(args[5].As<Function>()),
    args[6]->IsObject() ? args[6].As<Object>() : args.This()));
  NanReturnUndefined();
}



/******** HdtDocument#_searchLiterals ********/

class SearchLiteralsWorker : public NanAsyncWorker {
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
                       NanCallback* callback, Local<Object> self)
    : NanAsyncWorker(callback), document(document),
      substring(substring), offset(offset), limit(limit), totalCount(0) {
    SaveToPersistent("self", self);
  };

  void Execute() {
    if (!document->Supports(LiteralSearch)) {
      SetErrorMessage("The HDT document does not support literal search");
      return;
    }
    // Find matching literals
    LiteralDictionary *dict = (LiteralDictionary*)(document->GetHDT()->getDictionary());
    uint32_t* literalIds = NULL;
    totalCount = dict->substringToId((unsigned char*)substring.c_str(),
                                     substring.length(), &literalIds);
    // Find unique values
    const set<uint32_t> uniqueIds(literalIds, literalIds + totalCount);
    totalCount = uniqueIds.size();
    delete literalIds;

    // Select the desired range
    if (offset < totalCount) {
      set<uint32_t>::const_iterator it = uniqueIds.begin();
      advance(it, offset);
      while (it != uniqueIds.end() && literals.size() < limit) {
        string literal(dict->idToString(*(it++), OBJECT));
        literals.push_back(fromHdtLiteral(literal));
      }
    }
  }

  void HandleOKCallback() {
    NanScope();
    // Convert the literals into a JavaScript array
    uint32_t count = 0;
    Local<Array> literalsArray = NanNew<Array>(literals.size());
    for (vector<string>::const_iterator it = literals.begin(); it != literals.end(); it++)
      literalsArray->Set(count++, NanNew<String>(*it));

    // Send the JavaScript array and estimated total count through the callback
    const unsigned argc = 3;
    Handle<Value> argv[argc] = { NanNull(), literalsArray, NanNew<Integer>((uint32_t)totalCount) };
    callback->Call(GetFromPersistent("self"), argc, argv);
  }

  void HandleErrorCallback() {
    NanScope();
    Local<Value> argv[] = { Exception::Error(NanNew<String>(ErrorMessage())) };
    callback->Call(GetFromPersistent("self"), 1, argv);
  }
};

// Searches for a triple pattern in the document.
// JavaScript signature: HdtDocument#_searchLiterals(substring, offset, limit, callback, self)
NAN_METHOD(HdtDocument::SearchLiterals) {
  NanScope();
  assert(args.Length() == 5);

  // Create asynchronous task
  NanAsyncQueueWorker(new SearchLiteralsWorker(Unwrap<HdtDocument>(args.This()),
    *NanUtf8String(args[0]), args[1]->Uint32Value(), args[2]->Uint32Value(),
    new NanCallback(args[3].As<Function>()),
    args[4]->IsObject() ? args[4].As<Object>() : args.This()));
  NanReturnUndefined();
}



/******** HdtDocument#close ********/

// Closes the document, disabling all further operations.
// JavaScript signature: HdtDocument#close([callback], [self])
NAN_METHOD(HdtDocument::Close) {
  // Destroy the current document
  NanScope();
  HdtDocument* hdtDocument = Unwrap<HdtDocument>(args.This());
  hdtDocument->Destroy();

  // Call the callback if one was passed
  if (args.Length() >= 1 && args[0]->IsFunction()) {
    const Local<Function> callback = args[0].As<Function>();
    const Local<Object> self = args.Length() >= 2 && args[1]->IsObject() ?
                               args[1].As<Object>() : NanGetCurrentContext()->Global();
    const unsigned argc = 1;
    Handle<Value> argv[argc] = { NanNull() };
    callback->Call(self, argc, argv);
  }
  NanReturnUndefined();
}



/******** HdtDocument#closed ********/


// Gets the version of the module.
NAN_PROPERTY_GETTER(HdtDocument::Closed) {
  NanScope();
  HdtDocument* hdtDocument = Unwrap<HdtDocument>(args.This());
  NanReturnValue(NanNew<Boolean>(!hdtDocument->hdt));
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
