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
  return args.This();
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
  vector<TripleString*> triples;
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
  Dictionary* dictionary = args->hdt->getDictionary();
	TripleString triple = toHdtTriple(args->subject, args->predicate, args->object);
  TripleID tripleId;
  dictionary->tripleStringtoTripleID(triple, tripleId);
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
      TripleString* triple = new TripleString();
      dictionary->tripleIDtoTripleString(*it->next(), *triple);
      args->triples.push_back(fromHdtTriple(triple));
    }
  }
  delete it;
}

// Sends the result of Search through a callback.
void HdtDocument::SearchDone(uv_work_t *request, const int status) {
  // Convert the found triples into a JavaScript object array
  SearchArgs* args = (SearchArgs*)request->data;
  Handle<Array> triples = Array::New(args->triples.size());
  const Local<v8::String> SUBJECT   = String::NewSymbol("subject");
  const Local<v8::String> PREDICATE = String::NewSymbol("predicate");
  const Local<v8::String> OBJECT    = String::NewSymbol("object");
  long count = 0;
  for (vector<TripleString*>::iterator it = args->triples.begin(); it != args->triples.end(); it++) {
    Handle<Object> tripleObject = Object::New();
    tripleObject->Set(SUBJECT,   String::New((*it)->getSubject()  .c_str()));
    tripleObject->Set(PREDICATE, String::New((*it)->getPredicate().c_str()));
    tripleObject->Set(OBJECT,    String::New((*it)->getObject()   .c_str()));
    triples->Set(count++, tripleObject);
    delete *it;
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
  HandleScope scope;

  // Destroy the current document
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


// Creates an HDT triple from the JavaScript components
TripleString toHdtTriple(string& subject, string& predicate, string& object) {
  // Check if the object is a literal with a datatype, which needs conversion
  const char *obj, *objLast; char* literal = NULL;
  if (*(obj = &*object.begin()) == '"' && *(objLast = &*object.end() - 1) != '"') {
    // Find the possible start of the datatype
    const char *datatype = objLast;
    while (obj != --datatype && *datatype != '@' && *datatype != '^');
    // Change the data type representation by adding angular brackets
    if (*datatype == '^') {
      char* cpy = literal = new char[objLast - obj + 2 + 1];
      for (datatype++; obj != datatype; *cpy++ = *obj++);
      *cpy++ = '<';
      for (objLast++; datatype != objLast; *cpy++ = *datatype++);
      *cpy++ = '>'; *cpy++ = '\0';
      obj = literal;
    }
  }

  // Create the triple from its components
  TripleString triple(subject.c_str(), predicate.c_str(), obj);
  delete literal;
  return triple;
}

// Creates a JavaScript triple in-place from the HDT triple components
TripleString* fromHdtTriple(TripleString* triple) {
  // Check if the object is a literal with a datatype, which needs conversion
  string& object = triple->getObject();
  string::iterator obj, objLast;
  if (*(obj = object.begin()) == '"' && *(objLast = object.end() - 1) == '>') {
    // Find the start of the datatype
    string::iterator datatype = objLast;
    while (obj != --datatype && *datatype != '<');
    // Change the data type representation by removing angular brackets
    if (*datatype == '<')
      object.erase(datatype), object.erase(objLast - 1);
  }
  return triple;
}
