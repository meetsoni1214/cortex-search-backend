import { PineconeService } from "../services/pinecone.service";
interface SearchResult {
    id: string;
    score: number;
    content: string;
    metadata: Record<string, any>;
}
export declare class SearchController {
    private readonly pineconeService;
    private readonly logger;
    constructor(pineconeService: PineconeService);
    semanticSearch(body: {
        query: string;
        topK?: number;
        threshold?: number;
    }): Promise<SearchResult[]>;
    storeDocuments(body: {
        documents: Array<{
            text: string;
            metadata?: Record<string, any>;
        }>;
    }): Promise<{
        success: boolean;
        count: number;
    }>;
    deleteDocuments(body: {
        ids: string[];
    }): Promise<{
        success: boolean;
        count: number;
    }>;
    healthCheck(): {
        status: string;
        message: string;
    };
    demoSearch(body: {
        query: string;
        topK?: number;
    }): {
        id: string;
        score: number;
        content: string;
        metadata: {
            document_id: string;
            file_name: string;
            file_type: string;
            topic: string;
        };
    }[];
}
export {};
