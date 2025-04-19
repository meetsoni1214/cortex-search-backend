export interface SimplifiedSearchResponse {
  id: string;
  score: number;
  content: string;
  metadata: {
    document_id?: string;
    file_name?: string;
    file_type?: string;
    [key: string]: any;
  };
}