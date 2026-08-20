import { runAgent } from "@/agents/susan";

export default function Home() {
    const callSusan = () => { 
        console.log("Calling Susan...");
        runAgent("Hello Susan! Can you help me find the latest news about AI?").then(result => {
            console.log("Final Answer:", result.finalAnswer);
            console.log("Updated History:", result.updatedHistory);
        })
    }
    return (
        <div>
            <h1>Home Page</h1>
            <p>Welcome to the main page.</p>
            <button className="btn btn-primary" onClick={callSusan}>Call Susan</button>
        </div>
    );
}