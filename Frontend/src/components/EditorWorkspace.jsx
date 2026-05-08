import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
import useEditorStore from '../stores/useEditorStore';
import { getFilesMetaMap } from '../utils/fileSystem';
import { ydoc, getProvider } from '../utils/yjsSetup';
import { X, Play } from 'lucide-react';
import prettier from "prettier/standalone";
import prettierPluginBabel from "prettier/plugins/babel";
import prettierPluginEstree from "prettier/plugins/estree";
import prettierPluginHtml from "prettier/plugins/html";
import prettierPluginCss from "prettier/plugins/postcss";
import axios from 'axios';

const EditorWorkspace = () => {
    const { activeFileId, openFiles, addOpenFile, closeFile, theme, setIsExecuting, setOutputContent, appendOutputContent } = useEditorStore();
    const [filesMeta, setFilesMeta] = useState({});
    const editorRef = useRef(null);
    const bindingRef = useRef(null);
    const monacoRef = useRef(null);
    
    // Listen to files metadata changes
    useEffect(() => {
        const metaMap = getFilesMetaMap();
        const updateMeta = () => {
            const newMeta = {};
            for (let [key, val] of metaMap.entries()) {
                newMeta[key] = val;
            }
            setFilesMeta(newMeta);
        };
        updateMeta();
        metaMap.observe(updateMeta);
        return () => metaMap.unobserve(updateMeta);
    }, []);

    const activeFile = activeFileId ? filesMeta[activeFileId] : null;

    useEffect(() => {
        if (!editorRef.current || !activeFileId) return;

        // Cleanup previous binding
        if (bindingRef.current) {
            bindingRef.current.destroy();
            bindingRef.current = null;
        }

        const yText = ydoc.getText(activeFileId);
        
        // Let Monaco update its model before binding
        const model = editorRef.current.getModel();
        
        // Important: if replacing model language dynamically
        if (monacoRef.current) {
             monacoRef.current.editor.setModelLanguage(model, activeFile?.language || 'javascript');
        }

        const currentProvider = getProvider();
        
        // Only create binding if we have a valid provider with awareness
        if (currentProvider && currentProvider.awareness) {
            bindingRef.current = new MonacoBinding(
                yText,
                model,
                new Set([editorRef.current]),
                currentProvider.awareness
            );
        } else {
            // Fallback: create binding without awareness (no cursor sync but text still syncs)
            bindingRef.current = new MonacoBinding(
                yText,
                model,
                new Set([editorRef.current])
            );
        }

        return () => {
            if (bindingRef.current) {
                bindingRef.current.destroy();
                bindingRef.current = null;
            }
        };
    }, [activeFileId, activeFile?.language]);

    const handleMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        
        // Enable JS strict diagnostics
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
            diagnosticCodesToIgnore: [80001]
        });
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            checkJs: true
        });

        // Add format command (Shift+Alt+F)
        editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, async () => {
            await formatCode();
        });
        
        // Add run command (Ctrl+Enter)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, async () => {
            await runCode();
        });

        // Add save command dummy to prevent browser save
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
             // Already saving to Yjs instantaneously, just format if we want
             formatCode();
        });
    };

    const formatCode = async () => {
        if (!editorRef.current || !activeFile) return;
        
        const code = editorRef.current.getValue();
        let formatted = code;
        try {
            let plugins = [];
            let parser = 'babel';
            
            if (activeFile.language === 'javascript' || activeFile.language === 'typescript') {
                plugins = [prettierPluginBabel, prettierPluginEstree];
            } else if (activeFile.language === 'html') {
                plugins = [prettierPluginHtml];
                parser = 'html';
            } else if (activeFile.language === 'css') {
                plugins = [prettierPluginCss];
                parser = 'css';
            } else {
                return; // Not supported for standalone prettier
            }

            formatted = await prettier.format(code, {
                parser,
                plugins,
                singleQuote: true,
                tabWidth: 2
            });
            
            // Push exactly the changes without losing cursor
            const position = editorRef.current.getPosition();
            editorRef.current.executeEdits("prettier", [{
                range: editorRef.current.getModel().getFullModelRange(),
                text: formatted,
                forceMoveMarkers: true
            }]);
            editorRef.current.setPosition(position);
        } catch (err) {
            console.error("Format error", err);
        }
    };

    const runCode = async () => {
        if (!activeFile || !editorRef.current) return;
        const code = editorRef.current.getValue();
        
        setIsExecuting(true);
        setOutputContent('> Running ' + activeFile.name + '...\n');
        
        try {
            const res = await axios.post("http://localhost:3000/api/execute", {
                language: activeFile.language,
                code: code
            });
            
            if (res.data?.run?.output) {
                // Use appendOutputContent instead of the updater pattern
                appendOutputContent(res.data.run.output);
            } else if (res.data?.compile?.output) {
                appendOutputContent('Compile Error:\n' + res.data.compile.output);
            }
        } catch(error) {
            appendOutputContent('Execution failed: ' + error.message);
        } finally {
            setIsExecuting(false);
        }
    };

    if (openFiles.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-[#1e1e1e] text-gray-500">
                <p>Select a file to start coding</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col bg-[#1e1e1e]">
            {/* Tabs */}
            <div className="flex bg-[#252526] overflow-x-auto min-h-[35px] border-b border-[#1e1e1e] hide-scrollbar select-none">
                {openFiles.map(id => (
                    <div 
                        key={id} 
                        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer border-r border-[#1e1e1e] group 
                            ${activeFileId === id ? 'bg-[#1e1e1e] text-blue-400 border-t-2 border-t-blue-500' : 'text-gray-400 hover:bg-[#2d2d2d]'}`}
                        onClick={() => addOpenFile(id)}
                    >
                        <span className="text-sm whitespace-nowrap">{filesMeta[id]?.name || 'Unknown'}</span>
                        <button 
                            className={`p-0.5 rounded-md hover:bg-[#3d3d3d] ${activeFileId === id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                closeFile(id);
                            }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center px-4 py-1.5 bg-[#1e1e1e] border-b border-[#333]">
                <div className="text-xs text-gray-400">
                    {activeFile ? `Language: ${activeFile.language}` : ''}
                </div>
                <div className="flex gap-2">
                     <button 
                         onClick={formatCode}
                         className="flex items-center gap-1 text-xs text-gray-300 hover:text-white px-2 py-1 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] transition-colors"
                         title="Format Code (Shift+Alt+F)"
                     >
                         Format
                     </button>
                     <button 
                         onClick={runCode}
                         className="flex items-center gap-1 text-xs text-white bg-green-600 hover:bg-green-500 px-3 py-1 rounded shadow transition-colors"
                         title="Run Code (Ctrl+Enter)"
                     >
                         <Play size={12} fill="currentColor" /> Run
                     </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative">
                <Editor
                    height="100%"
                    theme={theme}
                    language={activeFile?.language || 'javascript'}
                    options={{
                        minimap: { enabled: true },
                        wordWrap: 'on',
                        autoClosingBrackets: 'always',
                        autoClosingQuotes: 'always',
                        bracketPairColorization: { enabled: true },
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: true,
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
                        scrollBeyondLastLine: false,
                        padding: { top: 16 }
                    }}
                    onMount={handleMount}
                />
            </div>
        </div>
    );
};

export default EditorWorkspace;
