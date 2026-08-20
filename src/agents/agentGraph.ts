// agentGraph.ts
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { createAgentNode } from "./agents";
import { orchestratorNode } from "./theGreatOne";

// 1. Define Shared Graph State
export const GraphState = Annotation.Root({
    userInput: Annotation<string>(),
    targetAgent: Annotation<string>(),
    result: Annotation<string>(),
    activeAgent: Annotation<string>(),
    messages: Annotation<BaseMessage[]>({
        value: (x, y) => y ?? x ?? [],
        default: () => [],
    }),
    onToken: Annotation<((token: string) => void) | undefined>(),
    onRoute: Annotation<((agent: string) => void) | undefined>(),
});

// 2. Orchestrator Node


// 3. Assemble StateGraph
const workflow = new StateGraph(GraphState)
    .addNode("orchestrator", orchestratorNode)
    .addNode("susan", createAgentNode("susan"))
    .addNode("gloria", createAgentNode("gloria"))

    .addEdge(START, "orchestrator")

    // Conditional routing based on orchestrator return
    .addConditionalEdges("orchestrator", (state) => state.targetAgent)

    .addEdge("susan", END)
    .addEdge("gloria", END);

export const appGraph = workflow.compile();