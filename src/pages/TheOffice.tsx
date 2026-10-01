import { useEffect, useRef, useState } from 'react';
import { OfficeGame } from '../game/office/OfficeGame';

export default function TheOffice() {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<OfficeGame | null>(null);
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
        console.log(chatMessage);
        if (!chatMessage.trim()) return;

        // Send text into Phaser scene
        gameRef.current?.showPlayerSpeech(chatMessage);
        setChatMessage('');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <h1>The Office</h1>

            {/* Phaser Canvas Container */}
            <div ref={containerRef} style={{ width: '100%', maxWidth: '600px', aspectRatio: '640 / 416' }} />

            {/* React Input Controls */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '600px' }}>
                <input
                    type="text"
                    value={chatMessage}
                    placeholder="Type message and press Enter..."
                    onChange={(e) => setChatMessage(e.target.value)}
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