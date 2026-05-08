import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import { createProvider, getProvider } from "../utils/yjsSetup";
import { initDefaultFiles } from "../utils/fileSystem";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import Sidebar from "../components/Sidebar";
import EditorWorkspace from "../components/EditorWorkspace";
import TerminalPanel from "../components/TerminalPanel";
import LivePreview from "../components/LivePreview";
import { Users, Files, LayoutTemplate } from "lucide-react";

const App = () => {
  const [username, setUsername] = useState(
    () => new URLSearchParams(window.location.search).get("username") || ""
  );
  const [room, setRoom] = useState(
    () => new URLSearchParams(window.location.search).get("room") || "default-room"
  );
  const [users, setUsers] = useState([]);
  const [activeSidebarTab, setActiveSidebarTab] = useState("files");
  const [showPreview, setShowPreview] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const providerRef = useRef(null);

  const handleJoin = (e) => {
    e.preventDefault();
    const uname = e.target.username.value.trim();
    const rname = e.target.room.value.trim() || "default-room";
    setUsername(uname);
    setRoom(rname);
    window.history.pushState({}, "", `?username=${encodeURIComponent(uname)}&room=${encodeURIComponent(rname)}`);
  };

  useEffect(() => {
    if (username) {
      const provider = createProvider(username, room);
      providerRef.current = provider;

      provider.on("sync", (isSynced) => {
        if (isSynced) initDefaultFiles();
      });

      provider.on("status", ({ status }) => {
        setConnectionStatus(status);
      });

      const updateUsers = () => {
        const states = Array.from(provider.awareness.getStates().values());
        setUsers(states.filter((s) => s.user).map((s) => s.user));
      };

      provider.awareness.on("change", updateUsers);
      updateUsers();

      const handleBeforeUnload = () => {
        provider.awareness.setLocalStateField("user", null);
      };
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        // Use destroy() not disconnect() to fully clean up all listeners
        provider.destroy();
        providerRef.current = null;
      };
    }
  }, [username, room]);

  /* ─── Login screen ─────────────────────────────────────────────────── */
  if (!username) {
    return (
      <main className="h-screen w-full bg-[#1e1e1e] flex items-center justify-center font-sans">
        <form
          className="flex flex-col gap-5 bg-[#252526] p-8 rounded-lg shadow-2xl border border-[#333] w-96 text-white"
          onSubmit={handleJoin}
        >
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-blue-500 mb-1">CodeWave IDE</h1>
            <p className="text-sm text-gray-400">Join a collaborative Room</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              name="username"
              required
              placeholder="e.g. Amit_Sahoo"
              className="bg-[#1e1e1e] p-2.5 rounded text-white border border-[#3c3c3c] focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Room Code
            </label>
            <input
              type="text"
              name="room"
              defaultValue="default-room"
              placeholder="e.g. team-codex"
              className="bg-[#1e1e1e] p-2.5 rounded text-white border border-[#3c3c3c] focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <button className="bg-blue-600 font-semibold text-white active:scale-[0.98] hover:bg-blue-500 transition-all p-2.5 rounded mt-2">
            Join Room
          </button>
        </form>
      </main>
    );
  }

  /* ─── IDE shell ─────────────────────────────────────────────────────── */
  return (
    <main className="h-screen w-full bg-[#1e1e1e] text-white flex flex-col font-sans overflow-hidden">

      {/* ── Top Navbar ── */}
      <header className="h-[40px] bg-[#333] flex items-center justify-between px-4 border-b border-[#1e1e1e] shrink-0 text-gray-300">
        <div className="flex items-center gap-4 text-sm font-semibold">
          <span className="text-white flex items-center gap-2">
            <LayoutTemplate size={16} className="text-blue-400" /> CodeWave IDE
          </span>
          <span className="px-2 py-0.5 rounded bg-[#444] text-xs font-medium tracking-wide">
            Room: {room}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              showPreview ? "bg-blue-600 text-white" : "bg-[#444] hover:bg-[#555]"
            }`}
          >
            See Live Preview
          </button>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex -space-x-1">
              {users.map((u, i) => (
                <div
                  key={i}
                  title={u.username}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-[#333]"
                  style={{ backgroundColor: u.color }}
                >
                  {u.username.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-gray-400 ml-1">{users.length} Online</span>
          </div>
        </div>
      </header>

      {/* ── Body (activity bar + resizable panels) ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Activity Bar */}
        <div className="w-[48px] bg-[#333] border-r border-[#1e1e1e] flex flex-col items-center py-4 gap-4 shrink-0">
          <button
            onClick={() => setActiveSidebarTab("files")}
            className={`p-2 rounded transition-colors ${
              activeSidebarTab === "files"
                ? "text-white bg-[#444]"
                : "text-gray-500 hover:text-gray-300"
            }`}
            title="Explorer"
          >
            <Files size={22} />
          </button>
          <button
            onClick={() => setActiveSidebarTab("users")}
            className={`p-2 rounded transition-colors ${
              activeSidebarTab === "users"
                ? "text-white bg-[#444]"
                : "text-gray-500 hover:text-gray-300"
            }`}
            title="Collaborators"
          >
            <Users size={22} />
          </button>
        </div>

        {/* ── Outer horizontal split (sidebar | editor | preview) ── */}
        <PanelGroup direction="horizontal" className="flex-1 min-w-0">

          {/* Sidebar */}
          <Panel defaultSize={20} minSize={12} maxSize={40}>
            <div className="h-full overflow-hidden bg-[#252526]">
              {activeSidebarTab === "files" ? (
                <Sidebar />
              ) : (
                <div className="p-4">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                    Collaborators
                  </h2>
                  <div className="flex flex-col gap-2">
                    {users.map((u, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: u.color }}
                        />
                        <span className="text-sm">{u.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {/* Sidebar ↔ Editor handle */}
          <PanelResizeHandle className="w-[5px] bg-[#1e1e1e] hover:bg-blue-500 active:bg-blue-400 transition-colors cursor-col-resize" />

          {/* ── Inner vertical split (editor | terminal) ── */}
          <Panel defaultSize={showPreview ? 50 : 80} minSize={30}>
            <PanelGroup direction="vertical" className="h-full">

              <Panel defaultSize={70} minSize={20}>
                <EditorWorkspace />
              </Panel>

              {/* Editor ↔ Terminal handle */}
              <PanelResizeHandle className="h-[5px] bg-[#2d2d2d] hover:bg-blue-500 active:bg-blue-400 transition-colors cursor-row-resize" />

              <Panel defaultSize={30} minSize={8}>
                <TerminalPanel />
              </Panel>

            </PanelGroup>
          </Panel>

          {/* Live Preview (conditional) */}
          {showPreview && (
            <>
              {/* Editor ↔ Preview handle */}
              <PanelResizeHandle className="w-[5px] bg-[#1e1e1e] hover:bg-blue-500 active:bg-blue-400 transition-colors cursor-col-resize" />
              <Panel defaultSize={30} minSize={20}>
                <LivePreview />
              </Panel>
            </>
          )}

        </PanelGroup>
      </div>

      {/* ── Status Bar ── */}
      <footer className={`h-[22px] ${connectionStatus === 'connected' ? 'bg-[#007acc]' : 'bg-[#cc6633]'} text-white flex items-center justify-between px-3 text-[11px] shrink-0 font-medium transition-colors`}>
        <div className="flex gap-4">
          <span>{username}</span>
          <span>{connectionStatus === 'connected' ? 'Workspace Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}</span>
        </div>
        <div className="flex gap-4">
          <span>Prettier</span>
          <span>ESLint/Monaco</span>
          <span>UTF-8</span>
        </div>
      </footer>
    </main>
  );
};

export default App;
