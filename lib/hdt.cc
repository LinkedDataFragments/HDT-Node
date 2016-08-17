#include <node.h>
#include <nan.h>
#include "HdtDocument.h"

using namespace v8;

NAN_MODULE_INIT(InitHdtModule) {
  Nan::Set(target, Nan::New("HdtDocument").ToLocalChecked(),
                   Nan::New(HdtDocument::GetConstructor()));
  Nan::Set(target, Nan::New("createHdtDocument").ToLocalChecked(),
                   Nan::GetFunction(Nan::New<FunctionTemplate>(HdtDocument::Create)).ToLocalChecked());
  Nan::Set(target, Nan::New("rdf2hdt").ToLocalChecked(),
                   Nan::GetFunction(Nan::New<FunctionTemplate>(HdtDocument::Rdf2Hdt)).ToLocalChecked());
}

NODE_MODULE(hdt, InitHdtModule)
