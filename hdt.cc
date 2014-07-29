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

  // Open the HDT file
  HDT *hdt;
  try { hdt = HDTManager::mapHDT(*filename); }
  catch (const char* error) {
    ThrowException(Exception::TypeError(String::New(error)));
    return scope.Close(Undefined());
  }
  delete hdt;

  return scope.Close(Undefined());
}

// Exposes members on the main module
void InitializeHdtModule(Handle<Object> exports) {
  exports->SetAccessor(String::NewSymbol("version"), VersionGetter, NULL);
  exports->Set(String::NewSymbol("search"), FunctionTemplate::New(Search)->GetFunction());
}
NODE_MODULE(hdt, InitializeHdtModule)
