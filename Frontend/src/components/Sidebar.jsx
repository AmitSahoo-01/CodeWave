import React, { useEffect, useState } from 'react';
import useEditorStore from '../stores/useEditorStore';
import { getFilesMetaMap, createFile, deleteFile } from '../utils/fileSystem';
import { FileCode2, FileJson, FileIcon, FileType, Plus, Trash2, FolderOpen } from 'lucide-react';

const Sidebar = () => {
  const { activeFileId, addOpenFile } = useEditorStore();
  const [files, setFiles] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  useEffect(() => {
    const metaMap = getFilesMetaMap();
    
    const updateFiles = () => {
      const currentFiles = Array.from(metaMap.values());
      const sorted = currentFiles.sort((a, b) => a.name.localeCompare(b.name));
      setFiles(sorted);
    };

    updateFiles();
    metaMap.observe(updateFiles);
    
    return () => metaMap.unobserve(updateFiles);
  }, []);

  const handleCreateFile = (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    
    let ext = newFileName.split('.').pop() || 'js';
    let lang = 'javascript';
    if (ext === 'py') lang = 'python';
    else if (ext === 'html') lang = 'html';
    else if (ext === 'css') lang = 'css';
    else if (ext === 'json') lang = 'json';
    else if (ext === 'ts') lang = 'typescript';
    else if (ext === 'cpp') lang = 'cpp';
    else if (ext === 'java') lang = 'java';

    const id = createFile(newFileName, lang);
    setIsCreating(false);
    setNewFileName('');
    addOpenFile(id);
  };

  const getIcon = (lang) => {
    if (lang === 'javascript' || lang === 'typescript' || lang === 'python' || lang === 'cpp' || lang === 'java') return <FileCode2 size={15} className="text-yellow-500 shrink-0" />;
    if (lang === 'json') return <FileJson size={15} className="text-green-500 shrink-0" />;
    if (lang === 'html' || lang === 'css') return <FileType size={15} className="text-blue-500 shrink-0" />;
    return <FileIcon size={15} className="text-gray-400 shrink-0" />;
  };

  return (
    <div className="h-full w-full bg-[#252526] text-gray-300 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#1e1e1e] shrink-0">
        <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex flex-row items-center gap-2">
            <FolderOpen size={13} className="text-gray-400"/>
            Project Files
        </h2>
        <button 
           onClick={() => setIsCreating(true)} 
           className="hover:text-white hover:bg-[#333] p-1 rounded transition-colors"
           title="New File"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Create File Input */}
      {isCreating && (
        <div className="px-3 py-2 bg-[#2d2d2d] shrink-0 border-b border-[#1e1e1e]">
          <form onSubmit={handleCreateFile} className="flex flex-row items-center gap-2">
              <FileIcon size={14} className="text-gray-500" />
              <input 
                type="text" 
                autoFocus 
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                   if (e.key === 'Escape') setIsCreating(false);
                }}
                onBlur={() => setIsCreating(false)}
                placeholder="filename.ext"
                className="w-full bg-[#1e1e1e] border border-blue-500/50 rounded px-2 py-1 text-xs outline-none text-white focus:border-blue-500 shadow-inner"
              />
          </form>
          <div className="text-[10px] text-gray-500 mt-1 pl-6">Press Esc to cancel</div>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-[2px]">
        {files.map(file => (
          <div 
            key={file.id} 
            className={`flex items-center justify-between px-3 py-1.5 mx-2 rounded cursor-pointer group transition-colors ${activeFileId === file.id ? 'bg-[#37373d] text-white' : 'hover:bg-[#2a2d2e] text-gray-400'}`}
            onClick={() => addOpenFile(file.id)}
            title="Click to open file"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {getIcon(file.language)}
              <span className={`text-[13px] truncate ${activeFileId === file.id ? 'font-medium' : ''}`}>{file.name}</span>
            </div>
            
            <button 
              className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-[3px] hover:bg-red-400/10 rounded transition-all"
              title="Delete File"
              onClick={(e) => {
                e.stopPropagation();
                if(confirm(`Are you sure you want to delete '${file.name}'?`)) deleteFile(file.id);
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {files.length === 0 && !isCreating && (
          <div className="flex flex-col items-center justify-center p-6 text-center h-full">
             <FolderOpen size={48} className="text-[#333] mb-3" strokeWidth={1} />
             <p className="text-xs text-gray-500 mb-4 px-4">Your project workspace is empty.</p>
             <button 
                 onMouseDown={(e) => {
                     e.preventDefault();
                     setIsCreating(true);
                 }}
                 className="flex items-center gap-2 text-xs text-white bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded uppercase font-bold tracking-wider shadow-md transition-all active:scale-95"
             >
                 <Plus size={14} /> Create File
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
