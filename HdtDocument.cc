#include <assert.h>
#include "HdtDocument.h"

using namespace v8;
using namespace hdt;

// Creates a new HDT document for the given filename.
HdtDocument::HdtDocument(const char* filename) {
  hdt = HDTManager::mapHDT(filename);
}

// Deletes the document.
HdtDocument::~HdtDocument() {
  delete hdt;
  hdt = NULL;
}

// Creates a constructor for an HdtDocument.
Persistent<Function> HdtDocument::CreateConstructor() {
  // Create constructor template
  Local<FunctionTemplate> constructorTemplate = FunctionTemplate::New(New);
  constructorTemplate->SetClassName(String::NewSymbol("HdtDocument"));
  constructorTemplate->InstanceTemplate()->SetInternalFieldCount(1);
  // Create prototype
  constructorTemplate->PrototypeTemplate()->Set(String::NewSymbol("_search"),
                                                FunctionTemplate::New(Search)->GetFunction());
  return Persistent<Function>::New(constructorTemplate->GetFunction());
}

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
// JavaScript signature: _search(subject, predicate, object, callback)
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
  Handle<Value> argv[2] = { Null(), triples };
  callback->Call(Context::GetCurrent()->Global(), 2, argv);
  return scope.Close(Undefined());
}
