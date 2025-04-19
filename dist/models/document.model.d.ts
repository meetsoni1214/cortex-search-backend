export interface DocumentInput {
    text: string;
    metadata?: Record<string, any>;
}
export interface SearchResult {
    id: string;
    score: number;
    content: string;
    metadata?: Record<string, any>;
}
export interface StoreResponse {
    success: boolean;
    count: number;
}
export interface DeleteResponse {
    success: boolean;
    count: number;
}
