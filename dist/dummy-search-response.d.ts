export declare function getDummySearchResults(query: string): {
    id: string;
    score: number;
    content: string;
    metadata: {
        document_id: string;
        file_name: string;
        file_type: string;
        topic: string;
    };
}[];
