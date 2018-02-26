declare module "hdt" {
  export interface Statement {
    subject: string;
    predicate: string;
    object: string;
  }

  export interface SearchTermsOpts {
    limit?: number;
    position?: "subject" | "predicate" | "object";
    prefix?: string;
  }

  export interface SearchLiteralsOpts {
    limit?: number;
    offset?: number;
  }

  export interface SearchLiteralsResult {
    literals: string[];
    totalCount: number;
  }

  export interface SearchTriplesOpts {
    limit?: number;
    offset?: number;
  }

  export interface SearchResult {
    triples: Statement[];
    totalCount: number;
    hasExactCount: boolean;
  }

  export interface Document {
    searchTriples(sub?: string, pred?: string, obj?: string, opts?: SearchTriplesOpts): Promise<SearchResult>;
    countTriples(sub?: string, pred?: string, obj?: string): Promise<SearchResult>;
    searchLiterals(substring: string, opts?: SearchLiteralsOpts): Promise<SearchLiteralsResult>;
    searchTerms(opts?: SearchTermsOpts): Promise<string[]>;
    close(): Promise<void>;
    readHeader(): Promise<string>;
    changeHeader(triples:string, outputFile:string): Promise<Document>;
  }

  export function fromFile(filename: string): Promise<Document>;
}
