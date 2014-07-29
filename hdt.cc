#include <node.h>
#include <v8.h>
#include <iostream>
#include <HDTManager.hpp>

using namespace hdt;
using namespace v8;

// Gets the version of the module.
Handle<Value> VersionGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  return scope.Close(String::New("HDT native"));
}

// Parses an argument as an RDF entity (IRI, literal, or blank/variable/empty)
const string ParseEntityArgument(const Local<Value>& value) {
  if (value->IsString()) {
    const String::Utf8Value utf8Value(value);
    const string entity(*utf8Value);
    return entity;
  }
  return "";
}

// Searches for a triple pattern in an HDT file.
// JavaScript signature: search(filename, subject, predicate, object)
Handle<Value> Search(const Arguments& args) {
  HandleScope scope;

  // Parse arguments
  if (args.Length() == 0 || !args[0]->IsString()) {
    ThrowException(Exception::TypeError(String::New("search should receive a string as first argument.")));
    return scope.Close(Undefined());
  }
  const String::Utf8Value filename(args[0]);
  const string subject   = args.Length() > 1 ? ParseEntityArgument(args[1]) : "";
  const string predicate = args.Length() > 2 ? ParseEntityArgument(args[2]) : "";
  const string object    = args.Length() > 3 ? ParseEntityArgument(args[3]) : "";

  // Open the HDT file
  HDT *hdt;
  try { hdt = HDTManager::mapHDT(*filename); }
  catch (const char* error) {
    ThrowException(Exception::TypeError(String::New(error)));
    return scope.Close(Undefined());
  }

  // Fill array with result triples
  Handle<Array> triples = Array::New(0);
  IteratorTripleString *it = hdt->search(subject.c_str(), predicate.c_str(), object.c_str());
  for (long count = 0; it->hasNext(); count++) {
    TripleString *triple = it->next();
    Handle<Object> object = Object::New();
    object->Set(String::NewSymbol("subject"),   String::New(triple->getSubject().c_str()));
    object->Set(String::NewSymbol("predicate"), String::New(triple->getPredicate().c_str()));
    object->Set(String::NewSymbol("object"),    String::New(triple->getObject().c_str()));
    triples->Set(count, object);
  }
  delete it;
  delete hdt;

  return scope.Close(triples);
}

// Exposes members on the main module
void InitializeHdtModule(Handle<Object> exports) {
  exports->SetAccessor(String::NewSymbol("version"), VersionGetter, NULL);
  exports->Set(String::NewSymbol("search"), FunctionTemplate::New(Search)->GetFunction());
}
NODE_MODULE(hdt, InitializeHdtModule)
