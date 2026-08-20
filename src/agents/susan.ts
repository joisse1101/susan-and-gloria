import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, AIMessage, ToolMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { duckDuckGoSearchTool } from "../tools/webSearch";
import { GUARDRAIL, PERSONAS } from "./personas";

const tools = [duckDuckGoSearchTool];
const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));

const llm = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "llama3.1:8b", 
}).bindTools(tools);

export async function runAgent(userPrompt: string, history: BaseMessage[] = [], persona: keyof typeof PERSONAS = "susan"): Promise<{ finalAnswer: string | any[]; updatedHistory: BaseMessage[] }> {
    const systemPrompt = PERSONAS[persona].systemPrompt;
    const messages: BaseMessage[] = [new SystemMessage(GUARDRAIL), new SystemMessage(systemPrompt), ...history, new HumanMessage(userPrompt)];

    console.log("Initial Messages:", messages);

    while (true) {
        const response = await llm.invoke(messages);
        messages.push(response);

        console.log("Received Response:", response);

        if (!response.tool_calls || response.tool_calls.length === 0) {
            const rawContent = typeof response.content === "string"
                ? response.content
                : JSON.stringify(response.content);

            const cleanContent = rawContent.replace(/^assistant\n?/i, '').trim();
            console.log("Final Response:", cleanContent);
            return { finalAnswer: cleanContent, updatedHistory: messages };
        }

        for (const toolCall of response.tool_calls) {
            console.log(`Invoking tool: ${toolCall.name} with input: ${JSON.stringify(toolCall.args)}`);
            const selectedTool = toolsByName[toolCall.name];
            if (selectedTool) {
                const toolOutput = await selectedTool.invoke(toolCall);
                console.log(`Tool Output from ${toolCall.name}:`, toolOutput);

                messages.push(
                    new ToolMessage({
                        content: String(toolOutput),
                        tool_call_id: toolCall.id!,
                    })
                );
            }
        }
    }
}