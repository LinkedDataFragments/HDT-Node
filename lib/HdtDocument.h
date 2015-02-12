#ifndef HDTDOCUMENT_H
#define HDTDOCUMENT_H

#include <node.h>
#include <nan.h>
#include <HDTManager.hpp>

class HdtDocument : public node::ObjectWrap {
 public:
  inline void Init(hdt::HDT* hdt) { this->hdt = hdt; }

  // createHdtDocument(filename, callback)
  static NAN_METHOD(Create);
  static const v8::Persistent<v8::Function>& GetConstructor();

 private:
  hdt::HDT* hdt;

  // Construction and destruction
  explicit HdtDocument();
  ~HdtDocument();
  void Destroy();
  static NAN_METHOD(New);
  static bool constructorInitialized;
  static v8::Persistent<v8::Function> constructor;

  // HdtDocument#_searchTriples(subject, predicate, object, offset, limit, callback, self)
  static NAN_METHOD(SearchTriples);
  // HdtDocument#close([callback], [self])
  static NAN_METHOD(Close);
  // HdtDocument#closed
  static NAN_PROPERTY_GETTER(ClosedGetter);
};

// Converts a JavaScript literal to an HDT literal
std::string& toHdtLiteral(std::string& literal);
// Converts an HDT literal to a JavaScript literal
std::string& fromHdtLiteral(std::string& literal);

#endif
