import { useState } from "react";
import { appGraph } from "../agents/agentGraph"; // Adjust path to where appGraph is exported

export default function Home() {
    const [userInput, setUserInput] = useState("");
    const [conversationHistory, setConversationHistory] = useState<{ speaker: string; message: string }[]>([]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && userInput.trim() !== "") {
            event.preventDefault();

            const currentInput = userInput;
            setUserInput("");

            // Add placeholder for incoming AI message alongside User message
            setConversationHistory(prev => [
                { speaker: "Thinking...", message: "" },
                { speaker: "User", message: currentInput },
                ...prev
            ]);

            callGraph(currentInput);
        }
    };

    const callGraph = async (input: string) => {
        console.log("Invoking Orchestrator Graph...");

        await appGraph.invoke({
            userInput: input,
            onRoute: (agentName: string) => {
                const formattedName = agentName.charAt(0).toUpperCase() + agentName.slice(1);
                setConversationHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[0] = { ...newHistory[0], speaker: formattedName };
                    return newHistory;
                });
            },
            onToken: (token: string) => {
                setConversationHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[0] = {
                        ...newHistory[0],
                        message: newHistory[0].message + token
                    };
                    return newHistory;
                });
            }
        });

    };

    return (
        <div>
            <input
                type="text"
                placeholder="Ask Susan or Gloria..."
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <div>
                {conversationHistory.map((entry, index) => (
                    <div key={index}>
                        <strong>{entry.speaker}:</strong> {entry.message}
                    </div>
                ))}
            </div>
        </div>
    );
}