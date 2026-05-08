import { ydoc } from "./yjsSetup.js";
import { v4 as uuidv4 } from "uuid";

export const getFilesMetaMap = () => ydoc.getMap("filesMeta");

// Track whether defaults have been initialized to prevent duplicates
let defaultsInitialized = false;

// Initialize with some default files if empty
export const initDefaultFiles = () => {
  if (defaultsInitialized) return;
  
  const metaMap = getFilesMetaMap();
  if (Array.from(metaMap.keys()).length === 0) {
    defaultsInitialized = true;
    // Create default files directly — no async IDB race condition
    createFile("main.js", "javascript", "root", "// Welcome to Collaborative IDE\nconsole.log('Hello World');\n");
    createFile("index.html", "html", "root", "<!DOCTYPE html>\n<html>\n<body>\n  <h1>Hello</h1>\n</body>\n</html>\n");
    createFile("styles.css", "css", "root", "body {\n  background: #1e1e1e;\n  color: white;\n}\n");
  } else {
    defaultsInitialized = true;
  }
};

export const createFile = (name, language, parentId = "root", initialContent = "") => {
  const fileId = uuidv4();
  const meta = { id: fileId, name, language, parentId };
  
  ydoc.transact(() => {
    getFilesMetaMap().set(fileId, meta);
    if (initialContent) {
      ydoc.getText(fileId).insert(0, initialContent);
    }
  });
  
  return fileId;
};

export const deleteFile = (fileId) => {
  getFilesMetaMap().delete(fileId);
  // Optional: clear text
};

export const renameFile = (fileId, newName) => {
  const meta = getFilesMetaMap().get(fileId);
  if (meta) {
    getFilesMetaMap().set(fileId, { ...meta, name: newName });
  }
};
