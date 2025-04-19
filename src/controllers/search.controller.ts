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
import { ConfigService } from "@nestjs/config";
import { OpenAI } from "openai";
import { exec } from "child_process";
import * as path from "path";
import { promisify } from "util";

interface SearchResult {
  id: string;
  score: number;
  content: string;
  title: string;
  metadata: Record<string, any>;
}

@Controller("search")
export class SearchController {
  private readonly logger = new Logger(SearchController.name);
  private openai: OpenAI;

  constructor(
    private readonly pineconeService: PineconeService,
    private configService: ConfigService
  ) {
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>("OPENAI_API_KEY"),
    });
  }
  
  private async generateTitle(content: string): Promise<string> {
    try {
      // Ensure we have content to work with
      if (!content || content === "No content available") {
        return "Untitled Document";
      }
      
      // Truncate content if it's too long
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
      return title.replace(/^["']|["']$/g, ''); // Remove quotes if present
    } catch (error) {
      this.logger.error(`Error generating title: ${error}`);
      return "Untitled Document";
    }
  }

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

      // Extract content from each result
      const extractedResults = rawResults.map((result) => {
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
      const sortedResults = extractedResults.sort((a, b) => b.score - a.score);
      
      // Generate titles for each result
      const resultsWithTitles = await Promise.all(
        sortedResults.map(async (result) => {
          const title = await this.generateTitle(result.content);
          return {
            ...result,
            title,
          };
        })
      );
      
      // Log the scores of the final results array
      this.logger.log(`Final results scores: ${resultsWithTitles.map(r => r.score).join(', ')}`);
      
      return resultsWithTitles;

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
          title: "Error Occurred",
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
  async demoSearch(@Body() body: { query: string; topK?: number }) {
    const { query, topK = 3 } = body;
    // Get dummy results, already sorted by score in descending order in getDummySearchResults
    const results = getDummySearchResults(query).slice(0, topK);
    
    // Generate titles for demo results
    const resultsWithTitles = await Promise.all(
      results.map(async (result) => {
        const title = await this.generateTitle(result.content);
        return {
          ...result,
          title,
        };
      })
    );
    
    // Log the scores of the final demo results array
    this.logger.log(`Final demo results scores: ${resultsWithTitles.map(r => r.score).join(', ')}`);
    
    return resultsWithTitles;
  }

  @Post("process-data")
  async processData() {
    this.logger.log("Starting data processing workflow");

    try {
      // Promisify exec for easier async/await usage
      const execPromise = promisify(exec);
      
      // Define paths
      const dataCollectionPath = "C:\\Users\\DELL\\Desktop\\Incubyte\\data-collection";
      const dataCollectionTmpPath = path.join(dataCollectionPath, "tmp");
      const embeddingPath = "C:\\Users\\DELL\\Desktop\\Incubyte\\embedding-and-storage";
      const embeddingDataPath = path.join(embeddingPath, "data");

      // For WSL to Windows interop, we'll use PowerShell to execute commands
      this.logger.log("Step 1: Running data collection script");
      
      // Command to run Python script in the data collection directory
      const dataCollectionCmd = `powershell.exe -Command "cd '${dataCollectionPath}' ; uv run main.py"`;
      this.logger.log(`Executing command: ${dataCollectionCmd}`);
      
      const dataCollectionResult = await execPromise(dataCollectionCmd);
      
      this.logger.log(`Data collection completed: ${dataCollectionResult.stdout}`);
      if (dataCollectionResult.stderr) {
        this.logger.warn(`Data collection warnings/errors: ${dataCollectionResult.stderr}`);
      }

      // Step 2: Copy files from tmp folder to embedding data folder using PowerShell
      this.logger.log("Step 2: Copying files from tmp to embedding data folder");
      
      // PowerShell command to create the destination directory if it doesn't exist
      const createDirCmd = `powershell.exe -Command "if (-not (Test-Path '${embeddingDataPath}')) { New-Item -ItemType Directory -Path '${embeddingDataPath}' -Force }"`;
      await execPromise(createDirCmd);
      
      // PowerShell command to copy all files
      const copyFilesCmd = `powershell.exe -Command "Copy-Item '${dataCollectionTmpPath}\\*' -Destination '${embeddingDataPath}' -Force"`;
      
      this.logger.log(`Executing copy command: ${copyFilesCmd}`);
      await execPromise(copyFilesCmd);
      
      // Get file count for reporting (optional)
      const fileCountCmd = `powershell.exe -Command "Get-ChildItem '${dataCollectionTmpPath}' -File | Measure-Object | Select-Object -ExpandProperty Count"`;
      const fileCountResult = await execPromise(fileCountCmd);
      const fileCount = fileCountResult.stdout.trim();
      
      this.logger.log(`Copied approximately ${fileCount} files`);

      // Step 3: Go to embedding folder and run the script
      this.logger.log("Step 3: Running embedding and storage script");
      
      const embeddingCmd = `powershell.exe -Command "cd '${embeddingPath}' ; uv run main.py"`;
      this.logger.log(`Executing command: ${embeddingCmd}`);
      
      const embeddingResult = await execPromise(embeddingCmd);
      
      this.logger.log(`Embedding completed: ${embeddingResult.stdout}`);
      if (embeddingResult.stderr) {
        this.logger.warn(`Embedding warnings/errors: ${embeddingResult.stderr}`);
      }
      
      // Step 4: Cleanup - remove files from the directories
      this.logger.log("Step 4: Cleaning up temporary files");
      
      // Remove files from embedding data directory
      const cleanupEmbeddingDataCmd = `powershell.exe -Command "Remove-Item '${embeddingDataPath}\\*' -Recurse -Force"`;
      this.logger.log(`Cleaning up embedding data directory: ${cleanupEmbeddingDataCmd}`);
      await execPromise(cleanupEmbeddingDataCmd);
      
      // Remove files and folder from data collection tmp directory
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
    } catch (error: any) {
      this.logger.error(`Error in data processing workflow: ${error.message || String(error)}`);
      return {
        success: false,
        error: error.message || String(error),
        stack: error.stack || "No stack trace available"
      };
    }
  }
}
