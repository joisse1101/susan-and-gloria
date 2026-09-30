import { ChatOpenAI } from "@langchain/openai";

export const createLLM = () =>
    new ChatOpenAI({
        configuration: {
            baseURL: "http://localhost:11434/v1",
        },
        apiKey: "ollama",
        modelName: "llama3.1:8b",
        temperature: 0,
    });
