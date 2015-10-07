#ifndef HDTDOCUMENT_H
#define HDTDOCUMENT_H

#include <node.h>
#include <nan.h>
#include <HDTManager.hpp>

enum HdtDocumentFeatures {
  LiteralSearch = 1, // The document supports substring search for literals
};

class HdtDocument : public node::ObjectWrap {
 public:
  HdtDocument(const v8::Local<v8::Object>& handle, hdt::HDT* hdt);

  // createHdtDocument(filename, callback)
  static NAN_METHOD(Create);
  static const Nan::Persistent<v8::Function>& GetConstructor();

  // Accessors
  hdt::HDT* GetHDT() { return hdt; }
  bool Supports(HdtDocumentFeatures feature) { return features & (int)feature; }

 private:
  hdt::HDT* hdt;
  int features;

  // Construction and destruction
  ~HdtDocument();
  void Destroy();
  static NAN_METHOD(New);

  // HdtDocument#_searchTriples(subject, predicate, object, offset, limit, callback, self)
  static NAN_METHOD(SearchTriples);
  // HdtDocument#_searchLiterals(substring, offset, limit, callback, self)
  static NAN_METHOD(SearchLiterals);
  // HdtDocument#_features
  static NAN_PROPERTY_GETTER(Features);
  // HdtDocument#close([callback], [self])
  static NAN_METHOD(Close);
  // HdtDocument#closed
  static NAN_PROPERTY_GETTER(Closed);
};

// Converts a JavaScript literal to an HDT literal
std::string& toHdtLiteral(std::string& literal);
// Converts an HDT literal to a JavaScript literal
std::string& fromHdtLiteral(std::string& literal);

#endif
