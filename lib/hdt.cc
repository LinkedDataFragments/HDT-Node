#include <node.h>
#include <nan.h>
#include "HdtDocument.h"

using namespace v8;

// Expose all members on the main module
void InitializeHdtModule(Handle<Object> exports) {
  exports->SetAccessor(NanNew<String>("HdtDocument"), HdtDocument::Constructor, NULL);
  exports->Set(NanNew<String>("createHdtDocument"),
               NanNew<FunctionTemplate>(HdtDocument::Create)->GetFunction());
}
NODE_MODULE(hdt, InitializeHdtModule)
