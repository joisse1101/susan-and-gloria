import { useEffect, useRef } from 'react';
import { OfficeGame } from '../game/office/OfficeGame';
import type { NpcName } from '../game/office/OfficeScene';
import { appGraph } from '../agents/agentGraph';

const NPC_NAMES: NpcName[] = ['susan', 'gloria'];

export default function TheOffice() {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<OfficeGame | null>(null);
    const busyRef = useRef(false);
    const sayRef = useRef<(text: string) => boolean>(() => false);

    useEffect(() => {
        if (!containerRef.current) return;

        gameRef.current = new OfficeGame(containerRef.current, (text) => sayRef.current(text));

        return () => {
            gameRef.current?.destroy();
        };
    }, []);

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

    // Chat is typed inside the game; the scene hands each finished line here
    useEffect(() => {
        sayRef.current = (text: string) => {
            if (busyRef.current) return false;
            void askCoworker(text);
            return true;
        };
    });

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
            {/* Phaser canvas container: fills the window, the camera scrolls the map */}
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            <div style={{ position: 'absolute', left: 16, bottom: 12, color: '#fff', opacity: 0.7, font: '12px sans-serif', pointerEvents: 'none' }}>
                Arrows to walk · / or Enter to chat · Esc to cancel
            </div>
        </div>
    );
}