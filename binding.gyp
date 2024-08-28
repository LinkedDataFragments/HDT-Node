{
  "targets": [
    {
      "target_name": "hdt",
      "sources": [
        "lib/hdt.cc",
        "lib/HdtDocument.cc",
        "<!@(ls -1 deps/libhdt/src/bitsequence/*.cpp)",
        "<!@(ls -1 deps/libhdt/src/dictionary/*.cpp)",
        "<!@(ls -1 deps/libhdt/src/hdt/*.cpp)",
        "<!@(ls -1 deps/libhdt/src/header/*.cpp)",
        "<!@(ls -1 deps/libhdt/src/huffman/*.cpp)",
        "<!@(ls -1 deps/libhdt/src/libdcs/*.cpp)",
        "<!@(ls -1 deps/libhdt/src/libdcs/fmindex/*.cpp)",
        "<!@(ls -1 deps/libhdt/src/rdf/*.cpp)",
        "<!@(ls -1 deps/libhdt/src/sequence/*.cpp)",
        "<!@(ls -1 deps/libhdt/src/triples/*.cpp)",
        "<!@(ls -1 deps/libhdt/src/util/*.cpp)",
        "<!@(ls -1 deps/libcds/src/static/bitsequence/*.cpp)",
        "<!@(ls -1 deps/libcds/src/static/coders/*.cpp)",
        "<!@(ls -1 deps/libcds/src/static/mapper/*.cpp)",
        "<!@(ls -1 deps/libcds/src/static/sequence/*.cpp)",
      ],
      "sources!": [
        "<!@(ls -1 deps/libcds/src/static/sequence/*S.cpp)",
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")",
        "deps/libhdt/include",
        "deps/libhdt/src/dictionary/",
        "deps/libcds/include",
        "deps/libcds/src/static/bitsequence",
        "deps/libcds/src/static/coders",
        "deps/libcds/src/static/mapper",
        "deps/libcds/src/static/permutation",
        "deps/libcds/src/static/sequence",
        "deps/libcds/src/utils",
      ],
      "defines": [
        "HAVE_CDS",
        "_LIBCPP_ENABLE_CXX17_REMOVED_UNARY_BINARY_FUNCTION",
      ],
      "cflags!":    [ "-fno-rtti", "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-rtti", "-fno-exceptions" ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_RTTI": "YES",
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "OTHER_CFLAGS": [
          "-stdlib=libc++",
          "-Wno-register"
        ],
      },
    },
  ],
}
