import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";

@Injectable()
export class PineconeService implements OnModuleInit {
  private readonly logger = new Logger(PineconeService.name);
  private pinecone!: Pinecone;
  private embeddings!: OpenAIEmbeddings;
  private indexName!: string;

  constructor(private configService: ConfigService) {
    this.indexName =
      this.configService.get<string>("PINECONE_INDEX_NAME") || "";
  }

  async onModuleInit() {
    try {
      // Initialize OpenAI embeddings
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.configService.get<string>("OPENAI_API_KEY"),
        modelName: "text-embedding-3-small",
      });

      // Get Pinecone environment variables
      const apiKey = this.configService.get<string>("PINECONE_API_KEY");
      const environment = this.configService.get<string>(
        "PINECONE_ENVIRONMENT"
      );

      if (!apiKey) {
        throw new Error("PINECONE_API_KEY is required");
      }

      if (!environment) {
        throw new Error("PINECONE_ENVIRONMENT is required");
      }

      // Initialize Pinecone client
      this.pinecone = new Pinecone({
        apiKey
      });

      // Log successful initialization with index name
      this.logger.log(
        `Pinecone service initialized successfully with index: ${this.indexName}`
      );

      // Check if index exists by attempting to describe it
      try {
        const index = this.pinecone.Index(this.indexName);
        const stats = await index.describeIndexStats();
        this.logger.log(
          `Connected to Pinecone index with ${stats.totalRecordCount || 0} vectors`
        );
      } catch (indexError: any) {
        this.logger.warn(
          `Could not access Pinecone index: ${indexError.message}`
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Error initializing Pinecone service: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async semanticSearch(query: string, topK: number = 5) {
    try {
      this.logger.log(
        `Performing semantic search for query: "${query}" with topK=${topK}`
      );

      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.embedQuery(query);
      this.logger.debug(
        `Generated embedding of length: ${queryEmbedding.length}`
      );

      // Get Pinecone index
      const index = this.pinecone.Index(this.indexName);

      // Query Pinecone
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

      // Map to expected format - simplify to reduce errors
      const results = queryResponse.matches.map((match) => {
        // Extract content from metadata if available
        const content = typeof match.metadata?.pageContent === 'string' 
          ? match.metadata.pageContent 
          : '';
          
        return {
          id: match.id,
          score: match.score,
          content: content,
          pageContent: content, // Keep for backwards compatibility
          metadata: match.metadata || {},
        };
      });

      this.logger.log(`Found ${results.length} results for query`);
      return results;
    } catch (error: any) {
      this.logger.error(
        `Error in semantic search: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async storeDocuments(documents: Document[]) {
    try {
      this.logger.log(`Storing ${documents.length} documents`);

      // Get embeddings for all documents
      const embeddings = await this.embeddings.embedDocuments(
        documents.map((doc) => doc.pageContent)
      );

      // Get Pinecone index
      const index = this.pinecone.Index(this.indexName);

      // Create records for Pinecone
      const vectors = documents.map((doc, i) => {
        // Generate ID if not provided
        const docId = doc.metadata?.id 
          ? String(doc.metadata.id) 
          : `doc-${Date.now()}-${i}`;
          
        return {
          id: docId,
          values: embeddings[i],
          metadata: {
            ...doc.metadata,
            pageContent: doc.pageContent, // Store text in metadata
          },
        };
      });

      // Upsert vectors in batches of 100
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        
        // Upsert vectors to Pinecone
        await index.upsert(batch);
      }

      this.logger.log(`Successfully stored ${documents.length} documents`);
      return { success: true, count: documents.length };
    } catch (error: any) {
      this.logger.error(
        `Error storing documents: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async deleteDocuments(ids: string[]) {
    try {
      this.logger.log(`Deleting ${ids.length} documents`);

      // Get Pinecone index
      const index = this.pinecone.Index(this.indexName);

      // Delete vectors by IDs
      await index.deleteMany(ids);

      this.logger.log(`Successfully deleted ${ids.length} documents`);
      return { success: true, count: ids.length };
    } catch (error: any) {
      this.logger.error(
        `Error deleting documents: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
