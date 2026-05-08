import { create } from 'zustand';

const useEditorStore = create((set) => ({
  activeFileId: null,
  openFiles: [],
  theme: 'vs-dark',
  sidebarWidth: 250,
  terminalHeight: 250,
  outputContent: '',
  isExecuting: false,
  
  setActiveFileId: (id) => set({ activeFileId: id }),
  
  addOpenFile: (id) => set((state) => {
    if (state.openFiles.includes(id)) {
      return { activeFileId: id }; // Just focus if already open
    }
    return { 
      openFiles: [...state.openFiles, id],
      activeFileId: id 
    };
  }),

  closeFile: (id) => set((state) => {
    const newOpenFiles = state.openFiles.filter(f => f !== id);
    let newActiveId = state.activeFileId;
    if (state.activeFileId === id) {
      newActiveId = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null;
    }
    return {
      openFiles: newOpenFiles,
      activeFileId: newActiveId
    };
  }),

  setTheme: (theme) => set({ theme }),
  
  setOutputContent: (content) => set({ outputContent: content }),
  
  appendOutputContent: (content) => set((state) => ({ 
    outputContent: state.outputContent + content + '\n' 
  })),

  setIsExecuting: (isExecuting) => set({ isExecuting }),
}));

export default useEditorStore;
