import * as RDF from "rdf-js";

declare module "hdt" {
  export interface SearchTermsOpts {
    limit?: number;
    position?: "subject" | "predicate" | "object";
    prefix?: string;
    subject?: string; // mutually exclusive with prefix and prioritized
    object?: string, // mutually exclusive with prefix and prioritized
  }

  export interface SearchLiteralsOpts {
    limit?: number;
    offset?: number;
  }

  export interface SearchLiteralsResult {
    literals: RDF.Literal[];
    totalCount: number;
  }

  export interface SearchTriplesOpts {
    limit?: number;
    offset?: number;
  }

  export interface SearchResult {
    triples: RDF.Quad[];
    totalCount: number;
    hasExactCount: boolean;
  }

  export interface Document {
    searchTriples(sub?: RDF.Term, pred?: RDF.Term, obj?: RDF.Term, opts?: SearchTriplesOpts): Promise<SearchResult>;
    countTriples(sub?: RDF.Term, pred?: RDF.Term, obj?: RDF.Term): Promise<SearchResult>;
    searchLiterals(substring: string, opts?: SearchLiteralsOpts): Promise<SearchLiteralsResult>;
    searchTerms(opts?: SearchTermsOpts): Promise<string[]>;
    close(): Promise<void>;
    readHeader(): Promise<string>;
    changeHeader(triples:string, outputFile:string): Promise<Document>;
  }

  export function fromFile(filename: string, opts?: { dataFactory?: RDF.DataFactory }): Promise<Document>;
}
