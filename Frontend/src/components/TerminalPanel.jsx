import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import useEditorStore from '../stores/useEditorStore';

const TerminalPanel = () => {
    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const { outputContent, isExecuting } = useEditorStore();

    useEffect(() => {
        if (!terminalRef.current) return;
        
        const term = new Terminal({
            theme: {
                background: '#1e1e1e',
                foreground: '#cccccc',
                cursor: '#ffcc00'
            },
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
            fontSize: 13,
            convertEol: true
        });
        
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        
        term.open(terminalRef.current);
        fitAddon.fit();
        
        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        const ro = new ResizeObserver(() => fitAddon.fit());
        ro.observe(terminalRef.current);

        return () => {
            ro.disconnect();
            term.dispose();
        };
    }, []);

    useEffect(() => {
        if (xtermRef.current && outputContent !== undefined) {
             xtermRef.current.clear();
             xtermRef.current.write(outputContent);
        }
    }, [outputContent]);

    return (
        <div className="h-full w-full flex flex-col bg-[#1e1e1e] border-t border-[#333]">
            <div className="flex items-center px-4 py-1.5 bg-[#252526] text-xs font-semibold text-gray-300">
                OUTPUT
                {isExecuting && (
                    <span className="ml-4 text-green-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Running...
                    </span>
                )}
            </div>
            <div className="flex-1 overflow-hidden p-2 pl-4" ref={terminalRef}></div>
        </div>
    );
};
export default TerminalPanel;
