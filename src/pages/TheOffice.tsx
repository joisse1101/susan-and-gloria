import { useEffect, useRef, useState } from 'react';
import { OfficeGame } from '../game/office/OfficeGame';
import type { NpcName } from '../game/office/OfficeScene';
import { appGraph } from '../agents/agentGraph';

const NPC_NAMES: NpcName[] = ['susan', 'gloria'];

export default function TheOffice() {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<OfficeGame | null>(null);
    const busyRef = useRef(false);
    const [chatMessage, setChatMessage] = useState('');

    useEffect(() => {
        if (!containerRef.current) return;

        gameRef.current = new OfficeGame(containerRef.current);

        return () => {
            gameRef.current?.destroy();
        };
    }, []);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatMessage.trim() || busyRef.current) return;

        const input = chatMessage;
        // Send text into Phaser scene
        gameRef.current?.showPlayerSpeech(input);
        setChatMessage('');
        void askCoworker(input);
    };

    // Same pipeline as Home: orchestrator picks Susan or Gloria, who thinks, then streams her reply
    const askCoworker = async (input: string) => {
        busyRef.current = true;
        let speaker = null as NpcName | null; // assigned in callbacks, so avoid narrowing to `null`
        let reply = '';
        // Nobody is chosen yet: both notice the player while the orchestrator decides
        for (const name of NPC_NAMES) gameRef.current?.showNpcNotice(name);
        console.log('[office] invoking graph:', input);
        try {
            await appGraph.invoke({
                userInput: input,
                onRoute: (agentName: string) => {
                    console.log('[office] routed to:', agentName);
                    if (agentName !== 'susan' && agentName !== 'gloria') return;
                    speaker = agentName;
                    for (const name of NPC_NAMES) {
                        if (name !== agentName) gameRef.current?.hideNpcBubble(name);
                    }
                    gameRef.current?.showNpcThinking(agentName);
                },
                onToken: (token: string) => {
                    if (!speaker) return;
                    if (!reply) console.log('[office] first token received');
                    reply += token;
                    gameRef.current?.setNpcSpeech(speaker, reply);
                }
            });
            console.log('[office] graph finished, reply:', reply);
        } catch (error) {
            console.error('[office] graph failed', error);
            if (speaker) gameRef.current?.setNpcSpeech(speaker, '...(something went wrong)');
        } finally {
            if (speaker) gameRef.current?.finishNpcSpeech(speaker);
            else for (const name of NPC_NAMES) gameRef.current?.hideNpcBubble(name); // failed before routing
            busyRef.current = false;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <h1>The Office</h1>

            {/* Phaser Canvas Container */}
            {/* Clicking the game drops focus from the input so movement keys work again */}
            <div
                ref={containerRef}
                onMouseDown={() => (document.activeElement as HTMLElement | null)?.blur()}
                style={{ width: '100%', maxWidth: '600px', aspectRatio: '640 / 416' }}
            />

            {/* React Input Controls */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '600px' }}>
                <input
                    type="text"
                    value={chatMessage}
                    placeholder="Type message and press Enter (Esc or click the room to walk)..."
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                        // Scroll a long reply back / forward without leaving the input
                        if (e.key === 'ArrowUp') { e.preventDefault(); gameRef.current?.scrollNpcSpeech(-1); }
                        else if (e.key === 'ArrowDown') { e.preventDefault(); gameRef.current?.scrollNpcSpeech(1); }
                        else if (e.key === 'Escape') e.currentTarget.blur(); // Leave the input to walk around
                    }}
                    onFocus={() => gameRef.current?.setTyping(true)}   // Disable WASD movement
                    onBlur={() => gameRef.current?.setTyping(false)}    // Re-enable WASD movement
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>
                    Say
                </button>
            </form>
        </div>
    );
}