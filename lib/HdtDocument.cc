#include <assert.h>
#include <vector>
#include "HdtDocument.h"

using namespace v8;
using namespace hdt;



/******** Construction and destruction ********/


// Creates a new HDT document.
HdtDocument::HdtDocument() : hdt(NULL) { }

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
Handle<Value> HdtDocument::New(const Arguments& args) {
  HandleScope scope;
  assert(args.IsConstructCall());

  HdtDocument* hdtDocument = new HdtDocument();
  hdtDocument->Wrap(args.This());
  return scope.Close(args.This());
}

// Creates the constructor of HdtDocument.
Persistent<Function> HdtDocument::CreateConstructor() {
  // Create constructor template
  Local<FunctionTemplate> constructorTemplate = FunctionTemplate::New(New);
  constructorTemplate->SetClassName(String::NewSymbol("HdtDocument"));
  constructorTemplate->InstanceTemplate()->SetInternalFieldCount(1);
  // Create prototype
  Local<v8::ObjectTemplate> prototypeTemplate = constructorTemplate->PrototypeTemplate();
  prototypeTemplate->Set(String::NewSymbol("_search"), FunctionTemplate::New(Search)->GetFunction());
  prototypeTemplate->Set(String::NewSymbol("close"),   FunctionTemplate::New(Close) ->GetFunction());
  prototypeTemplate->SetAccessor(String::NewSymbol("closed"), ClosedGetter, NULL);
  return Persistent<Function>::New(constructorTemplate->GetFunction());
}

// Constructor of HdtDocument.
Persistent<Function> HdtDocument::constructor = HdtDocument::CreateConstructor();



/******** createHdtDocument(filename) ********/

class CreateWorker : public NanAsyncWorker {
  string filename;
  HDT* hdt;

public:
  CreateWorker(char* filename, NanCallback *callback)
    : NanAsyncWorker(callback), filename(filename), hdt(NULL) { };

  void Execute() {
    try { hdt = HDTManager::mapIndexedHDT(filename.c_str()); }
    catch (const char* error) { SetErrorMessage(error); }
  }

  void HandleOKCallback() {
    NanScope();
    // Create new HDT document
    Local<Object> newDocument = NanNew(HdtDocument::GetConstructor())->NewInstance();
    HdtDocument* hdtDocument = HdtDocument::Unwrap<HdtDocument>(newDocument);
    hdtDocument->Init(hdt);
    // Send new HdtDocument object (or error) through the callback
    const unsigned argc = 2;
    Handle<Value> argv[argc] = { Null(), newDocument };
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



/******** HdtDocument#_search(subject, predicate, object, offset, limit, callback, self) ********/

class SearchWorker : public NanAsyncWorker {
  HDT* hdt;
  // JavaScript function arguments
  string subject, predicate, object;
  uint32_t offset, limit;
  Persistent<Object> self;
  // Callback return values
  vector<TripleID> triples;
  map<unsigned int, string> subjects, predicates, objects;
  size_t totalCount;

public:
  SearchWorker(HDT* hdt, char* subject, char* predicate, char* object,
               uint32_t offset, uint32_t limit, NanCallback* callback, Local<Object> self)
    : NanAsyncWorker(callback),
      hdt(hdt), subject(subject), predicate(predicate), object(object),
      offset(offset), limit(limit), totalCount(0) {
    SaveToPersistent("self", self);
  };

  void Execute() {
    // Prepare the triple pattern
    Dictionary* dict = hdt->getDictionary();
    TripleString triple(subject, predicate, toHdtLiteral(object));
    TripleID tripleId;
    dict->tripleStringtoTripleID(triple, tripleId);
    if ((subject[0]   && !tripleId.getSubject())   ||
        (predicate[0] && !tripleId.getPredicate()) ||
        (object[0]    && !tripleId.getObject()))   return;

    // Estimate the total number of triples
    IteratorTripleID* it = hdt->getTriples()->search(tripleId);
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
      Local<Object> tripleObject = Object::New();
      tripleObject->Set(SUBJECT, subjectStrings[it->getSubject()]);
      tripleObject->Set(PREDICATE, predicateStrings[it->getPredicate()]);
      tripleObject->Set(OBJECT, objectStrings[it->getObject()]);
      triplesArray->Set(count++, tripleObject);
    }

    // Send the JavaScript array and estimated total count through the callback
    const unsigned argc = 3;
    Handle<Value> argv[argc] = { Null(), triplesArray, NanNew<Integer>((uint32_t)totalCount) };
    callback->Call(GetFromPersistent("self"), argc, argv);
  }
};

// Searches for a triple pattern in the document.
// JavaScript signature: HdtDocument#_search(subject, predicate, object, offset, limit, callback)
NAN_METHOD(HdtDocument::Search) {
  NanScope();
  assert(args.Length() == 7);

  // Create asynchronous task
  NanAsyncQueueWorker(new SearchWorker(Unwrap<HdtDocument>(args.This())->hdt,
    *NanUtf8String(args[0]), *NanUtf8String(args[1]), *NanUtf8String(args[2]),
    args[3]->Uint32Value(), args[4]->Uint32Value(),
    new NanCallback(args[5].As<Function>()),
    args[6]->IsObject() ? args[6]->ToObject() : args.This()));
  NanReturnUndefined();
}



/******** HdtDocument#close() ********/


// Closes the document, disabling all further operations.
// JavaScript signature: HdtDocument#close([callback])
Handle<Value> HdtDocument::Close(const Arguments& args) {
  // Destroy the current document
  HandleScope scope;
  HdtDocument* hdtDocument = Unwrap<HdtDocument>(args.This());
  hdtDocument->Destroy();

  // Call the callback if one was passed
  if (args.Length() >= 1 && args[0]->IsFunction()) {
    const Local<Function> callback = Local<Function>::Cast(args[0]);
    const unsigned argc = 1;
    Handle<Value> argv[argc] = { Null() };
    callback->Call(Context::GetCurrent()->Global(), argc, argv);
  }
  return scope.Close(Undefined());
}



/******** HdtDocument#closed ********/


// Gets the version of the module.
Handle<Value> HdtDocument::ClosedGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  HdtDocument* hdtDocument = Unwrap<HdtDocument>(info.This());
  return scope.Close(Boolean::New(!hdtDocument->hdt));
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
