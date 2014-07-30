#include <node.h>
#include <v8.h>
#include <assert.h>
#include <iostream>
#include <HDTManager.hpp>

using namespace hdt;
using namespace v8;

// Searches for a triple pattern in an HDT file.
// JavaScript signature: search(filename, subject, predicate, object, callback)
Handle<Value> Search(const Arguments& args) {
  HandleScope scope;

  // Retrieve arguments
  assert(args.Length() == 5);
  const String::Utf8Value  filename(args[0]);
  const String::Utf8Value   subject(args[1]);
  const String::Utf8Value predicate(args[2]);
  const String::Utf8Value    object(args[3]);
  const Local<Function> callback = Local<Function>::Cast(args[4]);

  // Open the HDT file
  HDT *hdt;
  try { hdt = HDTManager::mapHDT(*filename); }
  catch (const char* error) {
    Handle<Value> argv[1] = { Exception::Error(String::New(error)) };
    callback->Call(Context::GetCurrent()->Global(), 1, argv);
    return scope.Close(Undefined());
  }

  // Fill array with result triples
  Handle<Array> triples = Array::New(0);
  IteratorTripleString *it = hdt->search(*subject, *predicate, *object);
  for (long count = 0; it->hasNext(); count++) {
    TripleString *triple = it->next();
    Handle<Object> tripleObject = Object::New();
    tripleObject->Set(String::NewSymbol("subject"),   String::New(triple->getSubject()  .c_str()));
    tripleObject->Set(String::NewSymbol("predicate"), String::New(triple->getPredicate().c_str()));
    tripleObject->Set(String::NewSymbol("object"),    String::New(triple->getObject()   .c_str()));
    triples->Set(count, tripleObject);
  }
  delete it;
  delete hdt;

  // Send the triples array to the callback
  Handle<Value> argv[2] = { Null(), triples };
  callback->Call(Context::GetCurrent()->Global(), 2, argv);
  return scope.Close(Undefined());
}

// Exposes members on the main module
void InitializeHdtModule(Handle<Object> exports) {
  exports->Set(String::NewSymbol("search"), FunctionTemplate::New(Search)->GetFunction());
}
NODE_MODULE(hdt, InitializeHdtModule)
