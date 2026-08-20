import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const duckDuckGoSearchTool = tool(
    async ({ query }) => {
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
                    title: el.querySelector('.result__title')?.textContent?.trim() || '',
                    snippet: el.querySelector('.result__snippet')?.textContent?.trim() || '',
                    link: el.querySelector('.result__url')?.getAttribute('href') || '',
                }));

            return JSON.stringify(results);
        } catch (error) {
            console.error('Web search failed:', error);
            return 'Failed to execute web search.';
        }
    },
    {
        name: "web_search",
        description: "Searches DuckDuckGo for quick facts, summaries, and definitions.",
        schema: z.object({
            query: z.string().describe("The topic or factual question to look up."),
        }),
    }
);