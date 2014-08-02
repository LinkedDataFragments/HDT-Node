#include <assert.h>
#include "HdtDocument.h"

using namespace v8;
using namespace hdt;

// Creates a new instance of HdtDocument.
// JavaScript signature: createHdtDocument(filename, callback)
Handle<Value> HdtDocument::Create(const Arguments& args) {
  HandleScope scope;
  assert(args.Length() == 2);

  // Try to create an HdtDocument instance
  TryCatch trycatch;
  const unsigned argc = 1;
  Handle<Value> error = Null();
  Handle<Value> argv[argc] = { args[0] };
  Handle<Value> hdtDocument = constructor->NewInstance(argc, argv);
  if (trycatch.HasCaught()) {
    error = trycatch.Exception();
    hdtDocument = Undefined();
  }

  // Send it through the callback
  const Local<Function> callback = Local<Function>::Cast(args[1]);
  const unsigned argc2 = 2;
  Handle<Value> argv2[argc2] = { error, hdtDocument };
  callback->Call(Context::GetCurrent()->Global(), argc2, argv2);
  return scope.Close(Undefined());
}

// Creates a new HDT document for the given filename.
HdtDocument::HdtDocument(const char* filename) {
  hdt = HDTManager::mapHDT(filename);
}

// Deletes the document.
HdtDocument::~HdtDocument() {
  Destroy();
}

// Destroys the document, disabling all further operations.
void HdtDocument::Destroy() {
  if (hdt) {
    delete hdt;
    hdt = NULL;
  }
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

// Constructs an HdtDocument wrapper.
Handle<Value> HdtDocument::New(const Arguments& args) {
  HandleScope scope;
  assert(args.Length() == 1);
  assert(args.IsConstructCall());
  const String::Utf8Value filename(args[0]);

  HdtDocument* hdtDocument;
  try { hdtDocument = new HdtDocument(*filename); }
  catch (const char* error) {
    ThrowException(Exception::Error(String::New(error)));
    return scope.Close(Undefined());
  }
  hdtDocument->Wrap(args.This());
  return args.This();
}

// Searches for a triple pattern in the document.
// JavaScript signature: HdtDocument#_search(subject, predicate, object, callback)
Handle<Value> HdtDocument::Search(const Arguments& args) {
  HandleScope scope;
  assert(args.Length() == 4);
  const String::Utf8Value   subject(args[0]);
  const String::Utf8Value predicate(args[1]);
  const String::Utf8Value    object(args[2]);
  const Local<Function> callback = Local<Function>::Cast(args[3]);

  // Fill array with result triples
  Handle<Array> triples = Array::New(0);
  HdtDocument* hdtDocument = ObjectWrap::Unwrap<HdtDocument>(args.This());
  IteratorTripleString *it = hdtDocument->hdt->search(*subject, *predicate, *object);
  for (long count = 0; it->hasNext(); count++) {
    TripleString *triple = it->next();
    Handle<Object> tripleObject = Object::New();
    tripleObject->Set(String::NewSymbol("subject"),   String::New(triple->getSubject()  .c_str()));
    tripleObject->Set(String::NewSymbol("predicate"), String::New(triple->getPredicate().c_str()));
    tripleObject->Set(String::NewSymbol("object"),    String::New(triple->getObject()   .c_str()));
    triples->Set(count, tripleObject);
  }
  delete it;

  // Send the triples array to the callback
  const unsigned argc = 2;
  Handle<Value> argv[argc] = { Null(), triples };
  callback->Call(Context::GetCurrent()->Global(), argc, argv);
  return scope.Close(Undefined());
}

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

// Gets the version of the module.
Handle<Value> HdtDocument::ClosedGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  HdtDocument* hdtDocument = ObjectWrap::Unwrap<HdtDocument>(info.This());
  return scope.Close(Boolean::New(!hdtDocument->hdt));
}
