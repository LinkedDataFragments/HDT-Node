#ifndef HDTDOCUMENT_H
#define HDTDOCUMENT_H

#include <node.h>
#include <HDTManager.hpp>

class HdtDocument : public node::ObjectWrap {
 public:
  static v8::Persistent<v8::Function> CreateConstructor();

 private:
  explicit HdtDocument(const char* filename);
  ~HdtDocument();

  static v8::Handle<v8::Value> New(const v8::Arguments& args);
  static v8::Handle<v8::Value> Search(const v8::Arguments& args);

  hdt::HDT* hdt;
};

#endif
