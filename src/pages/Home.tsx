import { runAgent } from "@/agents/susan";
import { useState } from "react";

export default function Home() {
    const [userInput, setUserInput] = useState("");
    const [conversationHistory, setConversationHistory] = useState<{ speaker: string; message: string }[]>([]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && userInput.trim() !== "") {
            event.preventDefault();

            const currentInput = userInput;
            setUserInput("");

            setConversationHistory(prev => [{ speaker: "User", message: currentInput }, ...prev]);

            callSusan(currentInput);
        }
    };

    const callSusan = (input: string) => {
        console.log("Calling Susan...");
        runAgent(input).then(result => {
            console.log("Final Answer:", result.finalAnswer);

            setConversationHistory(prev => [
                { speaker: "Susan", message: result.finalAnswer.toString() },
                ...prev
            ]);
        });
    };

    return (
        <div>
            <input
                type="text"
                placeholder="Type your message to Susan..."
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