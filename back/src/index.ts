import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { Manager } from "./game/manager";
import { Lobby } from "./game/lobby";

const app = express();
const server = http.createServer(app);
const io = new Server(
    server,
    {
        cors: {
            origin: "*",
        },
    }
)

const manager = new Manager(io);

io.on("connection", (socket) => {
    const name = socket.handshake.query.name;
    if (name === undefined || name === "" || Array.isArray(name)) {
        socket.emit("error", {
            message: "Name was not in expected format"
        })
        socket.disconnect()
        return;
    }

    const code = socket.handshake.query.code;
    if (code === undefined || code === "" || Array.isArray(code)) {
        socket.emit("error", {
            message: "Code was not in expected format"
        });
        socket.disconnect();
        return;
    }

    manager.registerConnection(code, name, socket, () => { return new Lobby(code) });
})

server.listen(8000, () => console.log("Server has been started"))