# NestJS Pinecone Semantic Search

A NestJS application that integrates with Pinecone and LangChain to provide semantic search capabilities.

## Features

- Semantic search using OpenAI embeddings and Pinecone vector database
- Document storage and retrieval
- Document deletion
- Health check endpoint

## Prerequisites

- Node.js (>= 16.x)
- npm (>= 8.x)
- A Pinecone account and API key
- An OpenAI API key

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your actual API keys and configuration

```bash
cp .env.example .env
```

## Environment Variables

- `PINECONE_API_KEY` - Your Pinecone API key
- `PINECONE_INDEX_NAME` - The name of your Pinecone index
- `PINECONE_ENVIRONMENT` - Your Pinecone environment (e.g., "us-west1-gcp")
- `PINECONE_NAMESPACE` - Namespace to use in Pinecone (default: "default")
- `OPENAI_API_KEY` - Your OpenAI API key

## Running the application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The application will be available at http://localhost:3000

## API Endpoints

### Health Check

```
GET /search/health
```

Returns the health status of the API.

### Semantic Search

```
POST /search/semantic
```

Request body:
```json
{
  "query": "your search query",
  "topK": 5 // optional, defaults to 5
}
```

Returns semantically similar documents from Pinecone.

### Store Documents

```
POST /search/documents
```

Request body:
```json
{
  "documents": [
    {
      "text": "Document content",
      "metadata": {
        "id": "doc1",
        "source": "example",
        "author": "John Doe"
      }
    }
  ]
}
```

Stores documents in Pinecone after embedding them with OpenAI.

### Delete Documents

```
POST /search/delete
```

Request body:
```json
{
  "ids": ["doc1", "doc2"]
}
```

Deletes documents from Pinecone by their IDs.

## License

This project is licensed under the MIT License.