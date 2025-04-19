import { OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Document } from "@langchain/core/documents";
export declare class PineconeService implements OnModuleInit {
    private configService;
    private readonly logger;
    private pinecone;
    private embeddings;
    private indexName;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    semanticSearch(query: string, topK?: number): Promise<{
        id: string;
        score: number | undefined;
        content: string;
        pageContent: string;
        metadata: import("@pinecone-database/pinecone").RecordMetadata;
    }[]>;
    storeDocuments(documents: Document[]): Promise<{
        success: boolean;
        count: number;
    }>;
    deleteDocuments(ids: string[]): Promise<{
        success: boolean;
        count: number;
    }>;
}
