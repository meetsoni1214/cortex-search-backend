import { Test, TestingModule } from '@nestjs/testing';
import { PineconeService } from '../../src/services/pinecone.service';
import { ConfigService } from '@nestjs/config';
import { Document } from '@langchain/core/documents';

// Mock the OpenAIEmbeddings class
jest.mock('@langchain/openai', () => ({
  OpenAIEmbeddings: jest.fn().mockImplementation(() => ({
    embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    embedDocuments: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]),
  })),
}));

// Mock the Pinecone client
jest.mock('@pinecone-database/pinecone', () => {
  const mockIndexMethods = {
    query: jest.fn().mockResolvedValue({
      matches: [
        {
          id: 'test-doc-1',
          score: 0.9,
          metadata: {
            pageContent: 'Test content',
            document_id: 'doc-123',
            file_name: 'test.md',
            file_type: 'text/markdown',
          },
        },
      ],
    }),
    upsert: jest.fn().mockResolvedValue({ upsertedCount: 2 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
    describeIndexStats: jest.fn().mockResolvedValue({ totalRecordCount: 10 }),
  };
  
  return {
    Pinecone: jest.fn().mockImplementation(() => ({
      Index: jest.fn().mockReturnValue(mockIndexMethods),
    })),
  };
});

describe('PineconeService', () => {
  let service: PineconeService;

  // Mock config service
  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'PINECONE_API_KEY':
          return 'test-api-key';
        case 'PINECONE_INDEX_NAME':
          return 'test-index';
        case 'PINECONE_ENVIRONMENT':
          return 'test-env';
        case 'OPENAI_API_KEY':
          return 'test-openai-key';
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PineconeService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PineconeService>(PineconeService);
    await service.onModuleInit(); // Initialize the service
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('semanticSearch', () => {
    it('should perform semantic search and return results', async () => {
      const query = 'test query';
      const topK = 3;
      
      const results = await service.semanticSearch(query, topK);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('test-doc-1');
      expect(results[0].score).toBe(0.9);
      expect(results[0].content).toBe('Test content');
    });

    it('should return empty array when no matches found', async () => {
      // Get access to the mocked Pinecone index
      const pineconeIndexInstance = (service as any).pinecone.Index();
      
      // Override the query method for this test only
      const originalQuery = pineconeIndexInstance.query;
      pineconeIndexInstance.query = jest.fn().mockResolvedValueOnce({ matches: [] });
      
      const query = 'no results query';
      const results = await service.semanticSearch(query);
      
      // Restore original mock
      pineconeIndexInstance.query = originalQuery;
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('storeDocuments', () => {
    it('should store documents in Pinecone', async () => {
      const documents = [
        new Document({
          pageContent: 'Test document 1',
          metadata: { id: 'doc1' },
        }),
        new Document({
          pageContent: 'Test document 2',
          metadata: { id: 'doc2' },
        }),
      ];
      
      const result = await service.storeDocuments(documents);
      
      expect(result.success).toBe(true);
      expect(result.count).toBe(documents.length);
    });
  });

  describe('deleteDocuments', () => {
    it('should delete documents from Pinecone', async () => {
      const ids = ['doc1', 'doc2'];
      
      const result = await service.deleteDocuments(ids);
      
      expect(result.success).toBe(true);
      expect(result.count).toBe(ids.length);
    });
  });
});