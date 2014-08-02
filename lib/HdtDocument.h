#ifndef HDTDOCUMENT_H
#define HDTDOCUMENT_H

#include <node.h>
#include <HDTManager.hpp>

class HdtDocument : public node::ObjectWrap {
 public:
  static v8::Handle<v8::Value> Create(const v8::Arguments& args);

 private:
  explicit HdtDocument(const char* filename);
  ~HdtDocument();

  void Destroy();

  static v8::Persistent<v8::Function> CreateConstructor();
  static v8::Persistent<v8::Function> constructor;

  static v8::Handle<v8::Value> New(const v8::Arguments& args);
  static v8::Handle<v8::Value> Search(const v8::Arguments& args);
  static v8::Handle<v8::Value> Close(const v8::Arguments& args);
  static v8::Handle<v8::Value> ClosedGetter(v8::Local<v8::String> property, const v8::AccessorInfo& info);

  hdt::HDT* hdt;
};

#endif
