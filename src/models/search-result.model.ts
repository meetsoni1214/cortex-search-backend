export interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
  values?: number[];
}
