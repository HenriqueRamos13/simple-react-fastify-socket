import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";
import { io, Socket } from "socket.io-client";

function App() {
  const [users, setUsers] = useState<any[]>([]);
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);
  const [socket, setSocket] = useState<Socket | any>(null);

  const connectSocket = () => {
    setSocket(
      io("http://localhost:3001/", {
        auth: {
          token: "1234",
        },
        reconnectionAttempts: 3,
        transports: ["websocket"],
      })
    );
  };

  useEffect(() => {
    if (socket) {
      socket.on("users", (data: any) => {
        console.log(data);
        setUsers(Object.assign([], data));
      });
    }
  }, [socket]);

  const move = () => {
    (socket as Socket).emit("move", { left: left + 1, top: top });
    setLeft(left + 1);
  };

  return (
    <div className="App">
      {users &&
        users.map((u) => (
          <div
            style={{
              position: "absolute",
              left: u.left,
              top: u.top,
              width: 10,
              height: 10,
              backgroundColor: "red",
            }}
          ></div>
        ))}
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => connectSocket()}>CON</button>
        <button onClick={() => move()}>MOVE</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  );
}

export default App;
