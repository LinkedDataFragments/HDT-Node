const hdt = require('../lib/hdt');
const DF = require('n3').DataFactory;
const BF = new (require('@comunica/utils-bindings-factory').BindingsFactory)(DF);

const REPLICATION = 100000;
hdt.fromFile('../test/test.hdt').then(runForDocument);

async function runForDocument(document) {
  console.time('warmup');
  await iterate(document, 10000, searchTriples);
  await iterate(document, 10000, searchBindings);
  console.timeEnd('warmup');

  console.time('searchTriples');
  await iterate(document, REPLICATION, searchTriples);
  console.timeEnd('searchTriples');

  console.time('searchBindings');
  await iterate(document, REPLICATION, searchBindings);
  console.timeEnd('searchBindings');
}

async function iterate(document, replication, fun) {
  for (let i = 0; i < replication; i++) {
    await fun(document);
  }
}

async function searchTriples(document) {
  const { triples } = await document.searchTriples(DF.namedNode('http://example.org/s2'), null, null);
  assert(triples.length == 10);
}

async function searchBindings(document) {
  const { bindings } = await document.searchBindings(BF, DF.namedNode('http://example.org/s2'), DF.variable('p'), DF.variable('o'));
  assert(bindings.length == 10);
}

function assert(condition, message) {
  if (!condition) {
    throw message || "Assertion failed";
  }
}
