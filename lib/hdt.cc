#include <node.h>
#include "HdtDocument.h"

using namespace v8;

// Expose all members on the main module
void InitializeHdtModule(Handle<Object> exports) {
  exports->Set(String::NewSymbol("createHdtDocument"),
               FunctionTemplate::New(HdtDocument::Create)->GetFunction());
}
NODE_MODULE(hdt, InitializeHdtModule)
