export function getDummySearchResults(query: string) {
  const results = [
    {
      id: "jmi-newsletter-1",
      score: 0.92,
      content: "# James Madison Intermediate School | Smore Newsletters\n\nTable of Contents vertical_align_top\n\n[SCIENCE FAIR REMINDERS](#bb2dy8flk7)\n[FEBRUARY IS THE MONTH OF KINDNESS AT JMI](#bprmklsur4)\n[VALENTINE'S DAY REMINDERS FOR JMI](#bd988o7zgj)\n[JMI'S 2ND ANNUAL VOCABULARY PARADE](#bjo73hlunw)\n[JMI FAMILY HANDBOOK 2024-2025](#bgu50p3rin)\n[JMI SUNDAY UPDATES](#b4h22sz2sz)\n\n# James Madison Intermediate School\n\n## FEBRUARY 2025\n\n# February 2025\n\n\"Let your KNIGHT Light Shine Bright!\"",
      metadata: {
        document_id: "8b161afb-4d6a-4ce1-a113-3dbccc2da79d",
        file_name: "jmi-newsletter-feb-2025.md",
        file_type: "text/markdown",
        topic: "school newsletter"
      }
    },
    {
      id: "jmi-events-1",
      score: 0.87,
      content: "## JMI STEM Night -6:00 p.m.\n\nGuest Reader Day\nGreen Eggs and Ham Day! Wear Green!\nGolden Knight Luncheon\nReading Jogs the Mind! Wear Workout Attire!\nRutgers's Women Lacrosse Visit\nThing 1 and 2 Day! Wear Matching Outfits with a friend or more!\nIf I Ran the Zoo Day! Wear Animal Print!\nLet's Have a Parade! Dress up as the word you Choose for the Vocabulary Parade!",
      metadata: {
        document_id: "fb83a294-cf85-4298-9b4e-af30783e8894",
        file_name: "march-2025-calendar.md",
        file_type: "text/markdown",
        topic: "school events"
      }
    },
    {
      id: "jmi-departments-1",
      score: 0.78,
      content: "#### GIFTED AND TALENTED\n\n[Please click here to view the February Newsletter from Mrs. Lehrman.]\n\n#### STRINGS\n\n[Please click here to view the February Newsletter from Mrs. Biscocho.]\n\n#### SPANISH\n\n[Please click here to view the February Newsletter from Sra. Nunez.]\n\n#### PHYSICAL EDUCATION\n\n[Please click here to view the February Newsletter from Mr. Molnar and Mr. Morales.]\n\n#### RESPONSE TO INTERVENTION (Math and Reading)\n\n[Please click here to view the February Newsletter from Mrs. Rudnick and Mrs. Zapoticzny.]",
      metadata: {
        document_id: "8b161afb-4d6a-4ce1-a113-3dbccc2da79d",
        file_name: "jmi-departments.md",
        file_type: "text/markdown",
        topic: "school departments"
      }
    },
    {
      id: "pinecone-info-1",
      score: 0.89,
      content: "Pinecone is a vector database that makes it easy to build high-performance vector search applications. It provides scalable vector storage with fast, approximate nearest neighbor search capabilities.",
      metadata: {
        document_id: "pinecone-doc-1",
        file_name: "pinecone-overview.md",
        file_type: "text/markdown",
        topic: "databases"
      }
    },
    {
      id: "semantic-search-1",
      score: 0.82,
      content: "Semantic search understands the intent and contextual meaning of search queries rather than just matching keywords. It uses embeddings to represent the meaning of text in a high-dimensional vector space.",
      metadata: {
        document_id: "semantic-doc-1",
        file_name: "semantic-search-overview.md",
        file_type: "text/markdown",
        topic: "search technology"
      }
    }
  ];
  
  // Simple filtering based on keyword match
  const lowerQuery = query.toLowerCase();
  
  // If no query, return all results
  if (!lowerQuery) {
    return results;
  }
  
  // Filter and adjust scores based on query match
  return results
    .map(result => {
      const content = result.content.toLowerCase();
      const hasExactMatch = content.includes(lowerQuery);
      
      // Check for topic match
      const topicMatch = result.metadata.topic?.toLowerCase().includes(lowerQuery);
      
      // Adjust score based on match quality
      let adjustedScore = result.score;
      if (hasExactMatch) {
        // Boost score for exact matches but keep within 0-1 range
        adjustedScore = Math.min(adjustedScore * 1.2, 0.99);
      } else if (topicMatch) {
        // Slight boost for topic matches
        adjustedScore = Math.min(adjustedScore * 1.1, 0.95);
      } else {
        // Check for partial matches
        const terms = lowerQuery.split(' ');
        const hasPartialMatch = terms.some(term => content.includes(term));
        
        if (!hasPartialMatch) {
          // Reduce score if no match is found
          adjustedScore = adjustedScore * 0.7;
        }
      }
      
      return {
        ...result,
        score: adjustedScore
      };
    })
    .sort((a, b) => b.score - a.score);
}