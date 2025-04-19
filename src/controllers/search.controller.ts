import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PineconeService } from "../services/pinecone.service";
import { Document } from "@langchain/core/documents";
import { getDummySearchResults } from "../dummy-search-response";

interface SearchResult {
  id: string;
  score: number;
  content: string;
  metadata: Record<string, any>;
}

@Controller("search")
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly pineconeService: PineconeService) {}

  @Post("semantic")
  async semanticSearch(
    @Body() body: { query: string; topK?: number; threshold?: number }
  ): Promise<SearchResult[]> {
    const { query, topK } = body;

    if (!query) {
      throw new BadRequestException("Query parameter is required");
    }

    this.logger.log(`Received semantic search request for query: "${query}"`);

    try {
      // Get real search results from Pinecone
      const rawResults = await this.pineconeService.semanticSearch(query, topK);

      // Debug raw results
      // this.logger.log(`Raw results: ${JSON.stringify(rawResults, null, 2)}`);

      // Process results
      const processedResults = rawResults.map((result) => {
        // Get content from appropriate field
        let content = "";

        if (typeof result.pageContent === "string" && result.pageContent) {
          // If pageContent is available and not empty, use it
          content = result.pageContent;
        } else if (result.content) {
          // If content is directly available
          content = result.content;
        } else if (result.metadata) {
          // Try to extract content from various metadata fields
          if (result.metadata._node_content) {
            try {
              const nodeContent = JSON.parse(
                result.metadata._node_content as string
              );
              if (nodeContent.text) {
                content = nodeContent.text;
              }
            } catch (err) {
              this.logger.error(`Error parsing _node_content: ${err}`);
            }
          } else if (result.metadata.pageContent) {
            // Some implementations store content in metadata.pageContent
            content = String(result.metadata.pageContent);
          } else if (result.metadata.content) {
            // Some implementations store content in metadata.content
            content = String(result.metadata.content);
          } else if (result.metadata.text) {
            // Some implementations store content in metadata.text
            content = String(result.metadata.text);
          }
        }

        // Debug content extraction
        if (!content) {
          this.logger.warn(`No content found for result ${result.id}`);
        }

        this.logger.log(`results: ${JSON.stringify(result, null, 2)}`);

        return {
          id: result.id,
          score: Math.abs(result.score || 0),
          content: content || "No content available",
          metadata: {
            document_id:
              result.metadata?.document_id || result.metadata?.doc_id || "",
            file_name: result.metadata?.file_name || "",
            file_type: result.metadata?.file_type || "",
          },
        };
      });
      
      // Sort results by score in descending order (highest scores first)
      return processedResults.sort((a, b) => b.score - a.score);

      // Remove fallback completely - we want to see real results only
      // this.logger.log('No real results found, using fallback data');
      // return getDummySearchResults(query);
    } catch (error) {
      this.logger.error(
        `Error in semantic search: ${(error as Error).message}`
      );

      // Return error details for debugging instead of dummy data
      this.logger.log("Returning error information");
      return [
        {
          id: "error",
          score: 0,
          content: `Error occurred: ${(error as Error).message}`,
          metadata: {
            error: (error as Error).message,
            stack: (error as Error).stack,
          },
        },
      ];
    }
  }

  @Post("documents")
  async storeDocuments(
    @Body()
    body: {
      documents: Array<{
        text: string;
        metadata?: Record<string, any>;
      }>;
    }
  ) {
    const { documents } = body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      throw new BadRequestException("Valid documents array is required");
    }

    const langchainDocs = documents.map(
      (doc) =>
        new Document({
          pageContent: doc.text,
          metadata: doc.metadata || {},
        })
    );

    return this.pineconeService.storeDocuments(langchainDocs);
  }

  @Post("delete")
  async deleteDocuments(@Body() body: { ids: string[] }) {
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException("Valid ids array is required");
    }

    return this.pineconeService.deleteDocuments(ids);
  }

  @Get("health")
  healthCheck() {
    return { status: "ok", message: "Semantic search API is operational" };
  }

  @Post("demo")
  demoSearch(@Body() body: { query: string; topK?: number }) {
    const { query, topK = 3 } = body;
    // Get dummy results, already sorted by score in descending order in getDummySearchResults
    return getDummySearchResults(query).slice(0, topK);
  }
}
