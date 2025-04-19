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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SearchController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const pinecone_service_1 = require("../services/pinecone.service");
const documents_1 = require("@langchain/core/documents");
const dummy_search_response_1 = require("../dummy-search-response");
let SearchController = SearchController_1 = class SearchController {
    constructor(pineconeService) {
        this.pineconeService = pineconeService;
        this.logger = new common_1.Logger(SearchController_1.name);
    }
    async semanticSearch(body) {
        const { query, topK } = body;
        if (!query) {
            throw new common_1.BadRequestException("Query parameter is required");
        }
        this.logger.log(`Received semantic search request for query: "${query}"`);
        try {
            const rawResults = await this.pineconeService.semanticSearch(query, topK);
            const processedResults = rawResults.map((result) => {
                let content = "";
                if (typeof result.pageContent === "string" && result.pageContent) {
                    content = result.pageContent;
                }
                else if (result.content) {
                    content = result.content;
                }
                else if (result.metadata) {
                    if (result.metadata._node_content) {
                        try {
                            const nodeContent = JSON.parse(result.metadata._node_content);
                            if (nodeContent.text) {
                                content = nodeContent.text;
                            }
                        }
                        catch (err) {
                            this.logger.error(`Error parsing _node_content: ${err}`);
                        }
                    }
                    else if (result.metadata.pageContent) {
                        content = String(result.metadata.pageContent);
                    }
                    else if (result.metadata.content) {
                        content = String(result.metadata.content);
                    }
                    else if (result.metadata.text) {
                        content = String(result.metadata.text);
                    }
                }
                if (!content) {
                    this.logger.warn(`No content found for result ${result.id}`);
                }
                this.logger.log(`results: ${JSON.stringify(result, null, 2)}`);
                return {
                    id: result.id,
                    score: Math.abs(result.score || 0),
                    content: content || "No content available",
                    metadata: {
                        document_id: result.metadata?.document_id || result.metadata?.doc_id || "",
                        file_name: result.metadata?.file_name || "",
                        file_type: result.metadata?.file_type || "",
                    },
                };
            });
            return processedResults.sort((a, b) => b.score - a.score);
        }
        catch (error) {
            this.logger.error(`Error in semantic search: ${error.message}`);
            this.logger.log("Returning error information");
            return [
                {
                    id: "error",
                    score: 0,
                    content: `Error occurred: ${error.message}`,
                    metadata: {
                        error: error.message,
                        stack: error.stack,
                    },
                },
            ];
        }
    }
    async storeDocuments(body) {
        const { documents } = body;
        if (!documents || !Array.isArray(documents) || documents.length === 0) {
            throw new common_1.BadRequestException("Valid documents array is required");
        }
        const langchainDocs = documents.map((doc) => new documents_1.Document({
            pageContent: doc.text,
            metadata: doc.metadata || {},
        }));
        return this.pineconeService.storeDocuments(langchainDocs);
    }
    async deleteDocuments(body) {
        const { ids } = body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw new common_1.BadRequestException("Valid ids array is required");
        }
        return this.pineconeService.deleteDocuments(ids);
    }
    healthCheck() {
        return { status: "ok", message: "Semantic search API is operational" };
    }
    demoSearch(body) {
        const { query, topK = 3 } = body;
        return (0, dummy_search_response_1.getDummySearchResults)(query).slice(0, topK);
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Post)("semantic"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "semanticSearch", null);
__decorate([
    (0, common_1.Post)("documents"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "storeDocuments", null);
__decorate([
    (0, common_1.Post)("delete"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "deleteDocuments", null);
__decorate([
    (0, common_1.Get)("health"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "healthCheck", null);
__decorate([
    (0, common_1.Post)("demo"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "demoSearch", null);
exports.SearchController = SearchController = SearchController_1 = __decorate([
    (0, common_1.Controller)("search"),
    __metadata("design:paramtypes", [pinecone_service_1.PineconeService])
], SearchController);
//# sourceMappingURL=search.controller.js.map