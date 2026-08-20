import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, AIMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";
import { duckDuckGoSearchTool } from "../tools/webSearch";

const tools = [duckDuckGoSearchTool];
const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));

const llm = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "llama3.1:8b", 
}).bindTools(tools);

export async function runAgent(userPrompt: string, history: BaseMessage[] = []) {
    const messages: BaseMessage[] = [...history, new HumanMessage(userPrompt)];

    console.log("Initial Messages:", messages);

    while (true) {
        const response = await llm.invoke(messages);
        messages.push(response);

        if (!response.tool_calls || response.tool_calls.length === 0) {
            console.log("Final Response:", response.content);
            return { finalAnswer: response.content, updatedHistory: messages };
        }

        for (const toolCall of response.tool_calls) {
            console.log(`Invoking tool: ${toolCall.name} with input: ${JSON.stringify(toolCall.args)}`);
            const selectedTool = toolsByName[toolCall.name];
            if (selectedTool) {
                const toolOutput = await selectedTool.invoke(toolCall);

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