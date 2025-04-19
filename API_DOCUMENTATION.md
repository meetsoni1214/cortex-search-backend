# NestJS Pinecone Semantic Search API Documentation

## Base URL

```
http://localhost:3000
```

## Authentication

Currently, the API does not implement authentication. In a production environment, you should implement an authentication mechanism such as JWT.

## Endpoints

### Health Check

Check if the API is operational.

**URL:** `/search/health`  
**Method:** `GET`  
**Auth required:** No

#### Success Response

**Code:** `200 OK`  
**Content example:**

```json
{
  "status": "ok",
  "message": "Semantic search API is operational"
}
```

---

### Semantic Search

Perform a semantic search query against the vector database.

**URL:** `/search/semantic`  
**Method:** `POST`  
**Auth required:** No  
**Content-Type:** `application/json`

#### Request Body

```json
{
  "query": "your search query",
  "topK": 5  // optional, defaults to 5
}
```

| Parameter | Type   | Description                                 | Required |
|-----------|--------|---------------------------------------------|----------|
| query     | string | The text query to search for                | Yes      |
| topK      | number | Number of results to return (default: 5)    | No       |

#### Success Response

**Code:** `200 OK`  
**Content example:**

```json
[
  {
    "id": "doc2",
    "score": 0.853,
    "title": "Pinecone Vector Database Overview",
    "content": "Pinecone is a vector database that makes it easy to build high-performance vector search applications.",
    "metadata": {
      "document_id": "pinecone-doc-1",
      "file_name": "pinecone-overview.md",
      "file_type": "text/markdown"
    }
  },
  {
    "id": "doc1",
    "score": 0.675,
    "title": "NestJS Framework Introduction",
    "content": "NestJS is a progressive Node.js framework for building efficient and scalable server-side applications.",
    "metadata": {
      "document_id": "nestjs-doc-1",
      "file_name": "nestjs-overview.md",
      "file_type": "text/markdown"
    }
  }
]
```

Results are sorted by score in descending order, with the most relevant matches appearing first.

| Field        | Type    | Description                                                |
|--------------|---------|----------------------------------------------------------|
| id           | string  | Unique identifier for the document                        |
| score        | number  | Similarity score (higher is more relevant, range 0-1)     |
| title        | string  | AI-generated title summarizing the document content       |
| content      | string  | The content of the document                              |
| metadata     | object  | Additional metadata associated with the document         |

#### Error Response

**Code:** `400 BAD REQUEST`  
**Content example:**

```json
{
  "statusCode": 400,
  "message": "Query parameter is required",
  "error": "Bad Request"
}
```

**Code:** `500 INTERNAL SERVER ERROR`  
**Content example:**

```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

---

### Store Documents

Store new documents in the vector database.

**URL:** `/search/documents`  
**Method:** `POST`  
**Auth required:** No  
**Content-Type:** `application/json`

#### Request Body

```json
{
  "documents": [
    {
      "text": "Document content goes here",
      "metadata": {
        "id": "unique-document-id",
        "source": "optional-source",
        "author": "optional-author",
        "date": "optional-date",
        "tags": ["optional", "tags"],
        "customField": "any custom metadata"
      }
    },
    {
      "text": "Another document content",
      "metadata": {
        "id": "another-unique-id"
      }
    }
  ]
}
```

| Parameter     | Type    | Description                                      | Required |
|---------------|---------|--------------------------------------------------|----------|
| documents     | array   | Array of document objects                        | Yes      |
| document.text | string  | The text content of the document                 | Yes      |
| document.metadata | object | Metadata object with properties               | No       |
| document.metadata.id | string | Unique identifier for the document         | Yes (in metadata) |

#### Success Response

**Code:** `201 CREATED`  
**Content example:**

```json
{
  "success": true,
  "count": 2
}
```

#### Error Response

**Code:** `400 BAD REQUEST`  
**Content example:**

```json
{
  "statusCode": 400,
  "message": "Valid documents array is required",
  "error": "Bad Request"
}
```

**Code:** `500 INTERNAL SERVER ERROR`  
**Content example:**

```json
{
  "statusCode": 500,
  "message": "Error storing documents"
}
```

---

### Delete Documents

Delete documents from the vector database by their IDs.

**URL:** `/search/delete`  
**Method:** `POST`  
**Auth required:** No  
**Content-Type:** `application/json`

#### Request Body

```json
{
  "ids": ["doc1", "doc2", "doc3"]
}
```

| Parameter | Type     | Description                          | Required |
|-----------|----------|--------------------------------------|----------|
| ids       | string[] | Array of document IDs to delete      | Yes      |

#### Success Response

**Code:** `200 OK`  
**Content example:**

```json
{
  "success": true,
  "count": 3
}
```

#### Error Response

**Code:** `400 BAD REQUEST`  
**Content example:**

```json
{
  "statusCode": 400,
  "message": "Valid ids array is required",
  "error": "Bad Request"
}
```

**Code:** `500 INTERNAL SERVER ERROR`  
**Content example:**

```json
{
  "statusCode": 500,
  "message": "Error deleting documents"
}
```

## Code Examples

### JavaScript / TypeScript (Fetch API)

#### Semantic Search
```javascript
async function performSemanticSearch(query, topK = 5) {
  try {
    const response = await fetch('http://localhost:3000/search/semantic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        topK,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const results = await response.json();
    return results;
  } catch (error) {
    console.error('Error performing semantic search:', error);
    throw error;
  }
}
```

#### Store Documents
```javascript
async function storeDocuments(documents) {
  try {
    const response = await fetch('http://localhost:3000/search/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documents,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error storing documents:', error);
    throw error;
  }
}
```

#### Delete Documents
```javascript
async function deleteDocuments(ids) {
  try {
    const response = await fetch('http://localhost:3000/search/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting documents:', error);
    throw error;
  }
}
```

### React Example

```jsx
import React, { useState } from 'react';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3000/search/semantic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          topK: 5,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Semantic Search</h2>
      
      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your search query"
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <div>
        <h3>Results:</h3>
        {results.length === 0 ? (
          <p>No results found</p>
        ) : (
          <ul>
            {results.map((result) => (
              <li key={result.id}>
                <h4 className="title">{result.title}</h4>
                <div className="score">Score: {result.score.toFixed(4)}</div>
                <div className="content">{result.content}</div>
                <div className="metadata">
                  <strong>Document ID:</strong> {result.metadata.document_id || 'N/A'}
                  {result.metadata.file_name && (
                    <span> | <strong>File:</strong> {result.metadata.file_name}</span>
                  )}
                  {result.metadata.file_type && (
                    <span> | <strong>Type:</strong> {result.metadata.file_type}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SearchComponent;
```

## Error Handling

The API returns standard HTTP status codes:

- `200 OK` - The request was successful
- `201 Created` - The resource was created successfully
- `400 Bad Request` - The request was malformed or missing required parameters
- `500 Internal Server Error` - An error occurred on the server

For client-side error handling, always check the response status and handle errors appropriately.

## Rate Limiting

Currently, the API does not implement rate limiting. For production, consider adding rate limiting to prevent abuse.

## CORS

CORS is enabled for all origins in the current configuration. For production, you may want to restrict this to specific domains.

## Versioning

The current API version is v1, which is implicit in the endpoints. Future versions may use a `/v2/` prefix.

## Support

For questions or issues, please contact the API administrator or open an issue in the project repository.