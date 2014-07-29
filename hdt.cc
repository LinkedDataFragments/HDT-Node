#include <node.h>
#include <v8.h>

using namespace v8;

// Gets the version of the module.
Handle<Value> VersionGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  return scope.Close(String::New("HDT native"));
}

// Exposes members on the main module
void InitializeHdtModule(Handle<Object> exports) {
  exports->SetAccessor(String::NewSymbol("version"), VersionGetter, NULL);
}
NODE_MODULE(hdt, InitializeHdtModule)
