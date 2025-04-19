import { PineconeService } from "../services/pinecone.service";
import { ConfigService } from "@nestjs/config";
interface SearchResult {
    id: string;
    score: number;
    content: string;
    title: string;
    metadata: Record<string, any>;
}
export declare class SearchController {
    private readonly pineconeService;
    private configService;
    private readonly logger;
    private openai;
    constructor(pineconeService: PineconeService, configService: ConfigService);
    private generateTitle;
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
    }): Promise<{
        title: string;
        id: string;
        score: number;
        content: string;
        metadata: {
            document_id: string;
            file_name: string;
            file_type: string;
            topic: string;
        };
    }[]>;
}
export {};
