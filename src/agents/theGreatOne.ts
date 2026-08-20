import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { GraphState } from "./agentGraph";
import { ChatOpenAI } from "@langchain/openAI";
import { PERSONAS } from "./personas";

export const orchestratorNode = async (state: typeof GraphState.State) => {
    const orchestratorLLM = new ChatOpenAI({
        configuration: { baseURL: "http://localhost:11434/v1" },
        apiKey: "ollama",
        modelName: "llama3.1:8b",
        temperature: 0,
    });

    const personas = Object.entries(PERSONAS)
        .map(([key, persona]) => `- "${key}": ${persona.whyMe}`)
        .join("\n");
    const personaList = Object.keys(PERSONAS).join(", ");

    const prompt = `You are The Great One, an orchestrator whose sole purpose is to evaluate the user's emotional state and choose the persona that will provide the most relatable, comforting, and acceptable response.

You must route the user to one of these personas:
${personas}

User Request: "{userInput}"

Respond with ONLY one word: ${personaList}. Do not include any punctuation, reasoning, or extra text.`;

    const response = await orchestratorLLM.invoke([
        new SystemMessage(prompt),
        new HumanMessage(state.userInput),
    ]);

    const rawDecision = response.content.toString().toLowerCase().trim();
    const targetAgent = rawDecision.includes("gloria") ? "gloria" : "susan";

    console.log(`Orchestrator decision: ${rawDecision} -> Routing to: ${targetAgent}`);
    state.onRoute?.(targetAgent);
    return { targetAgent };
};