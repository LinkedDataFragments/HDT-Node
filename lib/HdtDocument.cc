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
  prototypeTemplate->Set(String::NewSymbol("_search"), FunctionTemplate::New(SearchAsync)->GetFunction());
  prototypeTemplate->Set(String::NewSymbol("close"),   FunctionTemplate::New(Close) ->GetFunction());
  prototypeTemplate->SetAccessor(String::NewSymbol("closed"), ClosedGetter, NULL);
  return Persistent<Function>::New(constructorTemplate->GetFunction());
}

// Constructor of HdtDocument.
Persistent<Function> HdtDocument::constructor = HdtDocument::CreateConstructor();



/******** createHdtDocument(filename) ********/


// Arguments for CreateAsync
typedef struct CreateArgs {
  string filename;
  HDT* hdt;
  string error;
  Persistent<Function> callback;

  CreateArgs(char* filename, Persistent<Function> callback)
    : filename(filename), hdt(NULL), callback(callback) { };
} CreateArgs;

// Creates a new instance of HdtDocument.
// JavaScript signature: createHdtDocument(filename, callback)
Handle<Value> HdtDocument::CreateAsync(const Arguments& args) {
  HandleScope scope;
  assert(args.Length() == 2);

  // Create asynchronous task
  uv_work_t *request = new uv_work_t;
  request->data = new CreateArgs(*String::Utf8Value(args[0]),
      Persistent<Function>::New(Local<Function>::Cast(args[1])));
  uv_queue_work(uv_default_loop(), request, HdtDocument::Create, HdtDocument::CreateDone);
  return scope.Close(Undefined());
}

// Performs the creation of the HDT document's internals
void HdtDocument::Create(uv_work_t *request) {
  CreateArgs* args = (CreateArgs*)request->data;
  try { args->hdt = HDTManager::mapIndexedHDT(args->filename.c_str()); }
  catch (const char* error) { args->error = string(error); }
}

// Sends the result of Create through a callback.
void HdtDocument::CreateDone(uv_work_t *request, const int status) {
  HandleScope scope;
  CreateArgs* args = (CreateArgs*)request->data;

  // Send new HdtDocument object (or error) through the callback
  const unsigned argc = 2;
  Handle<Value> argv[argc] = { Null(), Undefined() };
  if (args->hdt) {
    // Create new HDT document
    Local<Object> newDocument = constructor->NewInstance(0, NULL);
    argv[1] = newDocument;
    // Set the HDT instance, which was created asynchronously by Create
    HdtDocument* hdtDocument = ObjectWrap::Unwrap<HdtDocument>(newDocument);
    hdtDocument->hdt = args->hdt;
  }
  else {
    // HDT instance creation was unsuccessful; send error
    argv[0] = Exception::Error(String::New(args->error.c_str()));
  }
  args->callback->Call(Context::GetCurrent()->Global(), argc, argv);

  // Delete objects used during the creation
  args->callback.Dispose();
  delete args;
  delete request;
}



/******** HdtDocument#_search(subject, predicate, object, offset, limit, callback, self) ********/


// Arguments for SearchAsync
typedef struct SearchArgs {
  HDT* hdt;
  // JavaScript function arguments
  string subject, predicate, object;
  uint32_t offset, limit;
  Persistent<Function> callback;
  Persistent<Object> self;
  // Callback return values
  vector<TripleID> triples;
  map<unsigned int, string> subjects, predicates, objects;
  size_t totalCount;

  SearchArgs(HDT* hdt, char* subject, char* predicate, char* object,
             uint32_t offset, uint32_t limit, Persistent<Function> callback, Persistent<Object> self)
    : hdt(hdt), subject(subject), predicate(predicate), object(object),
      offset(offset), limit(limit), callback(callback), self(self), totalCount(0) { };
} SearchArgs;

// Searches for a triple pattern in the document.
// JavaScript signature: HdtDocument#_search(subject, predicate, object, offset, limit, callback)
Handle<Value> HdtDocument::SearchAsync(const Arguments& args) {
  HandleScope scope;
  assert(args.Length() == 7);

  // Create asynchronous task
  uv_work_t *request = new uv_work_t;
  request->data = new SearchArgs(ObjectWrap::Unwrap<HdtDocument>(args.This())->hdt,
      *String::Utf8Value(args[0]), *String::Utf8Value(args[1]), *String::Utf8Value(args[2]),
      args[3]->Uint32Value(), args[4]->Uint32Value(),
      Persistent<Function>::New(Local<Function>::Cast(args[5])),
      Persistent<Object>::New(args[6]->IsObject() ? args[6]->ToObject() : args.This()));
  uv_queue_work(uv_default_loop(), request, HdtDocument::Search, HdtDocument::SearchDone);
  return scope.Close(Undefined());
}

// Performs the search for a triple pattern for SearchAsync.
void HdtDocument::Search(uv_work_t *request) {
  // Prepare the triple pattern
  SearchArgs* args = (SearchArgs*)request->data;
  Dictionary* dict = args->hdt->getDictionary();
  TripleString triple(args->subject, args->predicate, toHdtLiteral(args->object));
  TripleID tripleId;
  dict->tripleStringtoTripleID(triple, tripleId);
  if ((args->subject[0]   && !tripleId.getSubject())   ||
      (args->predicate[0] && !tripleId.getPredicate()) ||
      (args->object[0]    && !tripleId.getObject()))   return;

  // Estimate the total number of triples
  Triples* triples = args->hdt->getTriples();
  IteratorTripleID* it = triples->search(tripleId);
  args->totalCount = it->estimatedNumResults();

  // Go to the right offset
  uint32_t offset = args->offset, limit = args->limit;
  if (it->canGoTo())
    try { it->goTo(offset), offset = 0; }
    catch (char const* error) { /* invalid offset */ }
  else
    while (offset && it->hasNext()) it->next(), offset--;

  // Add matching triples to the result vector
  if (!offset) {
    while (limit-- && it->hasNext()) {
      TripleID& triple = *it->next();
      args->triples.push_back(triple);
      if (!args->subjects.count(triple.getSubject())) {
        args->subjects[triple.getSubject()] = dict->idToString(triple.getSubject(), SUBJECT);
      }
      if (!args->predicates.count(triple.getPredicate())) {
        args->predicates[triple.getPredicate()] = dict->idToString(triple.getPredicate(), PREDICATE);
      }
      if (!args->objects.count(triple.getObject())) {
        string object(dict->idToString(triple.getObject(), OBJECT));
        args->objects[triple.getObject()] = fromHdtLiteral(object);
      }
    }
  }
  delete it;
}

// Sends the result of Search through a callback.
void HdtDocument::SearchDone(uv_work_t *request, const int status) {
  HandleScope scope;
  SearchArgs* args = (SearchArgs*)request->data;

  // Convert the triple components into strings
  map<unsigned int, string>::const_iterator it;
  map<unsigned int, Local<String> > subjects, predicates, objects;
  for (it = args->subjects.begin(); it != args->subjects.end(); it++)
    subjects[it->first] = String::NewSymbol(it->second.c_str());
  for (it = args->predicates.begin(); it != args->predicates.end(); it++)
    predicates[it->first] = String::NewSymbol(it->second.c_str());
  for (it = args->objects.begin(); it != args->objects.end(); it++)
    objects[it->first] = String::NewSymbol(it->second.c_str());

  // Convert the triples into a JavaScript object array
  uint32_t count = 0;
  Local<Array> triples = Array::New(args->triples.size());
  const Local<String> SUBJECT   = String::NewSymbol("subject");
  const Local<String> PREDICATE = String::NewSymbol("predicate");
  const Local<String> OBJECT    = String::NewSymbol("object");
  for (vector<TripleID>::const_iterator it = args->triples.begin(); it != args->triples.end(); it++) {
    Local<Object> tripleObject = Object::New();
    tripleObject->Set(SUBJECT, subjects[it->getSubject()]);
    tripleObject->Set(PREDICATE, predicates[it->getPredicate()]);
    tripleObject->Set(OBJECT, objects[it->getObject()]);
    triples->Set(count++, tripleObject);
  }

  // Send the JavaScript array and estimated total count through the callback
  const unsigned argc = 3;
  Handle<Value> argv[argc] = { Null(), triples, Integer::New(args->totalCount) };
  args->callback->Call(args->self, argc, argv);

  // Delete objects used during the search
  args->callback.Dispose();
  args->self.Dispose();
  delete args;
  delete request;
}



/******** HdtDocument#close() ********/


// Closes the document, disabling all further operations.
// JavaScript signature: HdtDocument#close([callback])
Handle<Value> HdtDocument::Close(const Arguments& args) {
  // Destroy the current document
  HandleScope scope;
  HdtDocument* hdtDocument = ObjectWrap::Unwrap<HdtDocument>(args.This());
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
  HdtDocument* hdtDocument = ObjectWrap::Unwrap<HdtDocument>(info.This());
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
