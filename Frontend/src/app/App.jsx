import React, { use, useEffect } from "react";
import "./App.css";
import { Editor } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useRef, useMemo, useState } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";

const App = () => {
  const editorRef = useRef(null);
  const [ username, setUsername ] = useState(() => {
      return new URLSearchParams(window.location.search).get("username") || ""
    });
  const [users,setUsers] = useState([]);

  const ydoc = useMemo(() => new Y.Doc(), []);
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);


    const handleMount = (editor) => {
       editorRef.current = editor
   
       new MonacoBinding(
         yText,
         editorRef.current.getModel(),
         new Set([ editorRef.current ]),
       )
     };
 

   const handleJoin = (e) => {
    e.preventDefault()
    setUsername(e.target.username.value)
    window.history.pushState({}, "", "?username=" + e.target.username.value)



  };

  useEffect(() => {
  
      console.log(username)
  
      if (username) {
  
        const provider = new SocketIOProvider("http://localhost:3000", "monaco", ydoc, {
          autoConnect: true,
        })
  
        provider.awareness.setLocalStateField("user", { username })
  
  
        const states = Array.from(provider.awareness.getStates().values())
  
        console.log(states)
  
        setUsers(states.filter(state => state.user && state.user.username).map(state => state.user))
  
        provider.awareness.on("change", () => {
          const states = Array.from(provider.awareness.getStates().values())
          setUsers(states.filter(state => state.user && state.user.username).map(state => state.user))
        })
  
        function handleBeforeUnload() {
          provider.awareness.setLocalStateField("user", null)
        }
  
        window.addEventListener("beforeunload", handleBeforeUnload)
  
  
        return () => {
          provider.disconnect()
          window.removeEventListener("beforeunload", handleBeforeUnload)
        }
      }
    }, [
      username
    ]);

  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex p-4 items-center justify-center">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            handleJoin(e);
          }}
        >
          <input
            type="text"
            placeholder="Enter your username"
            name="username"
            className="bg-gray-800 p-3 rounded text-white placeholder:text-gray-500 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button className="bg-amber-500 text-white active:scale-95 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 p-1 rounded cursor-pointer ">
            Join
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="h-screen w-full bg-black flex gap-3 p-3">
      <aside className="h-full w-1/5 bg-[#1E1E1E] rounded-lg">
        <h2 className="text-2xl text-white text-center font-bold p-4 border-b border-gray-300">Users</h2>
        <ul className="p-4">
          {users.map((user, index) => (
            <li key={index} className="p-2  text-white rounded mb-2">
              {index + 1}. {user.username}
            </li>
          ))}
        </ul>
      </aside>
      <section className="h-full w-4/5 bg-[#1E1E1E] overflow-hidden rounded-lg">
        <Editor
        className="p-2 edt"
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// console.log('Amit sahoo');"
          theme="vs-dark"
          onMount={handleMount}
        />
      </section>
    </main>
  );
};

export default App;
