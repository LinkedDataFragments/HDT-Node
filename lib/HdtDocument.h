#ifndef HDTDOCUMENT_H
#define HDTDOCUMENT_H

#include <node.h>
#include <HDTManager.hpp>

class HdtDocument : public node::ObjectWrap {
 public:
  // createHdtDocument(filename)
  static v8::Handle<v8::Value> CreateAsync(const v8::Arguments& args);
  static void Create(uv_work_t *req);
  static void CreateDone(uv_work_t *req, const int status);

 private:
  hdt::HDT* hdt;

  // Construction and destruction
  explicit HdtDocument();
  ~HdtDocument();
  void Destroy();
  static v8::Handle<v8::Value> New(const v8::Arguments& args);
  static v8::Persistent<v8::Function> CreateConstructor();
  static v8::Persistent<v8::Function> constructor;

  // HdtDocument#_search(subject, predicate, object, offset, limit, callback, self)
  static v8::Handle<v8::Value> SearchAsync(const v8::Arguments& args);
  static void Search(uv_work_t *req);
  static void SearchDone(uv_work_t *req, const int status);

  // HdtDocument#close()
  static v8::Handle<v8::Value> Close(const v8::Arguments& args);

  // HdtDocument#closed
  static v8::Handle<v8::Value> ClosedGetter(v8::Local<v8::String> property, const v8::AccessorInfo& info);
};

#endif
