"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PineconeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PineconeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const pinecone_1 = require("@pinecone-database/pinecone");
const openai_1 = require("@langchain/openai");
let PineconeService = PineconeService_1 = class PineconeService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(PineconeService_1.name);
        this.indexName =
            this.configService.get("PINECONE_INDEX_NAME") || "";
    }
    async onModuleInit() {
        try {
            this.embeddings = new openai_1.OpenAIEmbeddings({
                openAIApiKey: this.configService.get("OPENAI_API_KEY"),
                modelName: "text-embedding-3-small",
            });
            const apiKey = this.configService.get("PINECONE_API_KEY");
            const environment = this.configService.get("PINECONE_ENVIRONMENT");
            if (!apiKey) {
                throw new Error("PINECONE_API_KEY is required");
            }
            if (!environment) {
                throw new Error("PINECONE_ENVIRONMENT is required");
            }
            this.pinecone = new pinecone_1.Pinecone({
                apiKey
            });
            this.logger.log(`Pinecone service initialized successfully with index: ${this.indexName}`);
            try {
                const index = this.pinecone.Index(this.indexName);
                const stats = await index.describeIndexStats();
                this.logger.log(`Connected to Pinecone index with ${stats.totalRecordCount || 0} vectors`);
            }
            catch (indexError) {
                this.logger.warn(`Could not access Pinecone index: ${indexError.message}`);
            }
        }
        catch (error) {
            this.logger.error(`Error initializing Pinecone service: ${error.message}`, error.stack);
            throw error;
        }
    }
    async semanticSearch(query, topK = 5) {
        try {
            this.logger.log(`Performing semantic search for query: "${query}" with topK=${topK}`);
            const queryEmbedding = await this.embeddings.embedQuery(query);
            this.logger.debug(`Generated embedding of length: ${queryEmbedding.length}`);
            const index = this.pinecone.Index(this.indexName);
            const queryResponse = await index.query({
                vector: queryEmbedding,
                topK,
                includeMetadata: true
            });
            this.logger.debug(`Pinecone query response received`);
            if (!queryResponse.matches || queryResponse.matches.length === 0) {
                this.logger.log("No matches found for query");
                return [];
            }
            const results = queryResponse.matches.map((match) => {
                const content = typeof match.metadata?.pageContent === 'string'
                    ? match.metadata.pageContent
                    : '';
                return {
                    id: match.id,
                    score: match.score,
                    content: content,
                    pageContent: content,
                    metadata: match.metadata || {},
                };
            });
            this.logger.log(`Found ${results.length} results for query`);
            return results;
        }
        catch (error) {
            this.logger.error(`Error in semantic search: ${error.message}`, error.stack);
            throw error;
        }
    }
    async storeDocuments(documents) {
        try {
            this.logger.log(`Storing ${documents.length} documents`);
            const embeddings = await this.embeddings.embedDocuments(documents.map((doc) => doc.pageContent));
            const index = this.pinecone.Index(this.indexName);
            const vectors = documents.map((doc, i) => {
                const docId = doc.metadata?.id
                    ? String(doc.metadata.id)
                    : `doc-${Date.now()}-${i}`;
                return {
                    id: docId,
                    values: embeddings[i],
                    metadata: {
                        ...doc.metadata,
                        pageContent: doc.pageContent,
                    },
                };
            });
            const batchSize = 100;
            for (let i = 0; i < vectors.length; i += batchSize) {
                const batch = vectors.slice(i, i + batchSize);
                await index.upsert(batch);
            }
            this.logger.log(`Successfully stored ${documents.length} documents`);
            return { success: true, count: documents.length };
        }
        catch (error) {
            this.logger.error(`Error storing documents: ${error.message}`, error.stack);
            throw error;
        }
    }
    async deleteDocuments(ids) {
        try {
            this.logger.log(`Deleting ${ids.length} documents`);
            const index = this.pinecone.Index(this.indexName);
            await index.deleteMany(ids);
            this.logger.log(`Successfully deleted ${ids.length} documents`);
            return { success: true, count: ids.length };
        }
        catch (error) {
            this.logger.error(`Error deleting documents: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.PineconeService = PineconeService;
exports.PineconeService = PineconeService = PineconeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PineconeService);
//# sourceMappingURL=pinecone.service.js.map