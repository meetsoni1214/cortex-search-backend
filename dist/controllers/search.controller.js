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
const config_1 = require("@nestjs/config");
const openai_1 = require("openai");
const child_process_1 = require("child_process");
const path = require("path");
const util_1 = require("util");
let SearchController = SearchController_1 = class SearchController {
    constructor(pineconeService, configService) {
        this.pineconeService = pineconeService;
        this.configService = configService;
        this.logger = new common_1.Logger(SearchController_1.name);
        this.openai = new openai_1.OpenAI({
            apiKey: this.configService.get("OPENAI_API_KEY"),
        });
    }
    async generateTitle(content) {
        try {
            if (!content || content === "No content available") {
                return "Untitled Document";
            }
            const truncatedContent = content.length > 1000
                ? content.substring(0, 1000) + "..."
                : content;
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that generates concise, descriptive titles for text content. Create a title that is brief (5-7 words maximum) but captures the essence of the content."
                    },
                    {
                        role: "user",
                        content: `Generate a concise title for this content: "${truncatedContent}"`
                    }
                ],
                max_tokens: 30,
                temperature: 0.7
            });
            const title = response.choices[0]?.message?.content?.trim() || "Untitled Document";
            return title.replace(/^["']|["']$/g, '');
        }
        catch (error) {
            this.logger.error(`Error generating title: ${error}`);
            return "Untitled Document";
        }
    }
    async semanticSearch(body) {
        const { query, topK } = body;
        if (!query) {
            throw new common_1.BadRequestException("Query parameter is required");
        }
        this.logger.log(`Received semantic search request for query: "${query}"`);
        try {
            const rawResults = await this.pineconeService.semanticSearch(query, topK);
            const extractedResults = rawResults.map((result) => {
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
            const sortedResults = extractedResults.sort((a, b) => b.score - a.score);
            const resultsWithTitles = await Promise.all(sortedResults.map(async (result) => {
                const title = await this.generateTitle(result.content);
                return {
                    ...result,
                    title,
                };
            }));
            this.logger.log(`Final results scores: ${resultsWithTitles.map(r => r.score).join(', ')}`);
            return resultsWithTitles;
        }
        catch (error) {
            this.logger.error(`Error in semantic search: ${error.message}`);
            this.logger.log("Returning error information");
            return [
                {
                    id: "error",
                    score: 0,
                    title: "Error Occurred",
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
    async demoSearch(body) {
        const { query, topK = 3 } = body;
        const results = (0, dummy_search_response_1.getDummySearchResults)(query).slice(0, topK);
        const resultsWithTitles = await Promise.all(results.map(async (result) => {
            const title = await this.generateTitle(result.content);
            return {
                ...result,
                title,
            };
        }));
        this.logger.log(`Final demo results scores: ${resultsWithTitles.map(r => r.score).join(', ')}`);
        return resultsWithTitles;
    }
    async processData() {
        this.logger.log("Starting data processing workflow");
        try {
            const execPromise = (0, util_1.promisify)(child_process_1.exec);
            const dataCollectionPath = "C:\\Users\\DELL\\Desktop\\Incubyte\\data-collection";
            const dataCollectionTmpPath = path.join(dataCollectionPath, "tmp");
            const embeddingPath = "C:\\Users\\DELL\\Desktop\\Incubyte\\embedding-and-storage";
            const embeddingDataPath = path.join(embeddingPath, "data");
            this.logger.log("Step 1: Running data collection script");
            const dataCollectionCmd = `powershell.exe -Command "cd '${dataCollectionPath}' ; uv run main.py"`;
            this.logger.log(`Executing command: ${dataCollectionCmd}`);
            const dataCollectionResult = await execPromise(dataCollectionCmd);
            this.logger.log(`Data collection completed: ${dataCollectionResult.stdout}`);
            if (dataCollectionResult.stderr) {
                this.logger.warn(`Data collection warnings/errors: ${dataCollectionResult.stderr}`);
            }
            this.logger.log("Step 2: Copying files from tmp to embedding data folder");
            const createDirCmd = `powershell.exe -Command "if (-not (Test-Path '${embeddingDataPath}')) { New-Item -ItemType Directory -Path '${embeddingDataPath}' -Force }"`;
            await execPromise(createDirCmd);
            const copyFilesCmd = `powershell.exe -Command "Copy-Item '${dataCollectionTmpPath}\\*' -Destination '${embeddingDataPath}' -Force"`;
            this.logger.log(`Executing copy command: ${copyFilesCmd}`);
            const copyResult = await execPromise(copyFilesCmd);
            const fileCountCmd = `powershell.exe -Command "Get-ChildItem '${dataCollectionTmpPath}' -File | Measure-Object | Select-Object -ExpandProperty Count"`;
            const fileCountResult = await execPromise(fileCountCmd);
            const fileCount = fileCountResult.stdout.trim();
            this.logger.log(`Copied approximately ${fileCount} files`);
            this.logger.log("Step 3: Running embedding and storage script");
            const embeddingCmd = `powershell.exe -Command "cd '${embeddingPath}' ; uv run main.py"`;
            this.logger.log(`Executing command: ${embeddingCmd}`);
            const embeddingResult = await execPromise(embeddingCmd);
            this.logger.log(`Embedding completed: ${embeddingResult.stdout}`);
            if (embeddingResult.stderr) {
                this.logger.warn(`Embedding warnings/errors: ${embeddingResult.stderr}`);
            }
            this.logger.log("Step 4: Cleaning up temporary files");
            const cleanupEmbeddingDataCmd = `powershell.exe -Command "Remove-Item '${embeddingDataPath}\\*' -Recurse -Force"`;
            this.logger.log(`Cleaning up embedding data directory: ${cleanupEmbeddingDataCmd}`);
            await execPromise(cleanupEmbeddingDataCmd);
            const cleanupTmpCmd = `powershell.exe -Command "if (Test-Path '${dataCollectionTmpPath}') { Remove-Item '${dataCollectionTmpPath}' -Recurse -Force }"`;
            this.logger.log(`Cleaning up data collection tmp directory: ${cleanupTmpCmd}`);
            await execPromise(cleanupTmpCmd);
            this.logger.log("Cleanup completed successfully");
            return {
                success: true,
                message: "Data processing workflow completed successfully",
                steps: {
                    dataCollection: "completed",
                    fileCopy: `Copied ${fileCount} files`,
                    embedding: "completed",
                    cleanup: "completed"
                }
            };
        }
        catch (error) {
            this.logger.error(`Error in data processing workflow: ${error.message || String(error)}`);
            return {
                success: false,
                error: error.message || String(error),
                stack: error.stack || "No stack trace available"
            };
        }
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
    __metadata("design:returntype", Promise)
], SearchController.prototype, "demoSearch", null);
__decorate([
    (0, common_1.Post)("process-data"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "processData", null);
exports.SearchController = SearchController = SearchController_1 = __decorate([
    (0, common_1.Controller)("search"),
    __metadata("design:paramtypes", [pinecone_service_1.PineconeService,
        config_1.ConfigService])
], SearchController);
//# sourceMappingURL=search.controller.js.map