// agents.ts
import { HumanMessage, BaseMessage, SystemMessage, AIMessageChunk } from "@langchain/core/messages";
import { GUARDRAIL, PERSONAS } from "./personas";
import { createLLM } from "./llm";

const llm = createLLM();

// LangGraph Agent Node Factory
export function createAgentNode(persona: "susan" | "gloria") {
    return async (state: { userInput: string; messages?: BaseMessage[]; onToken?: (token: string) => void }) => {
        const systemPrompt = PERSONAS[persona].systemPrompt;
        const history = state.messages || [];

        const messages: BaseMessage[] = [
            new SystemMessage(GUARDRAIL),
            new SystemMessage(systemPrompt),
            ...history,
            new HumanMessage(state.userInput),
        ];

        const stream = await llm.stream(messages);
        let fullAnswer = "";
        let accumulatedMessage: AIMessageChunk | null = null;

        for await (const chunk of stream) {
            accumulatedMessage = accumulatedMessage ? accumulatedMessage.concat(chunk) : chunk;
            const token = typeof chunk.content === "string" ? chunk.content : "";

            if (token) {
                const cleanedToken = !fullAnswer && token.startsWith("assistant\n")
                    ? token.replace(/^assistant\n?/i, "")
                    : token;

                fullAnswer += cleanedToken;
                state.onToken?.(cleanedToken); // Invoke token callback if streaming to UI
            }
        }

        const updatedMessages = accumulatedMessage ? [...messages, accumulatedMessage] : messages;

        return {
            result: fullAnswer,
            messages: updatedMessages,
            activeAgent: persona,
        };
    };
}