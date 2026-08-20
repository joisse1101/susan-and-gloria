import { tool } from "@langchain/core/tools";
import { z } from "zod";

const maxSnippetLength = 300; // Define a maximum length for the snippet

export const duckDuckGoSearchTool = tool(
    async ({ query }) => {
        if (query.trim().length === 0) {
            return "This tool is for specific factual questions or real-time news. Please provide a specific query.";
        }
        try {
            const url = `/api/duckduckgo/html/?q=${encodeURIComponent(query)}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();

            // Parse the HTML string for search results using DOMParser
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const results = Array.from(doc.querySelectorAll('.result__body'))
                .slice(0, 5)
                .map((el) => ({
                    title: (el.querySelector('.result__title')?.textContent?.trim() || '')
                        .replace(/\s+/g, ' '),
                    snippet: (el.querySelector('.result__snippet')?.textContent?.trim() || '')
                        .replace(/https?:\/\/\S+/g, '') // Strips any raw URLs inside the text
                        .replace(/\s+/g, ' ')           // Collapses multiple spaces and newlines
                        .slice(0, maxSnippetLength),
                }));

            return JSON.stringify(results);
        } catch (error) {
            console.error('Web search failed:', error);
            return 'Failed to execute web search.';
        }
    },
    {
        name: "web_search",
        description:
            "A quick fact-checking tool for specific factual questions or real-time news. NEVER use this tool for greetings, pleasantries, small talk, or casual conversation (e.g., 'hi', 'heya', 'how are you').",
        schema: z.object({
            query: z.string().describe("The specific search query. Must NOT be 'greeting' or casual text."),
        }),
    }
);