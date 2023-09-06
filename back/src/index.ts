import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { Manager } from "./game/manager";

export function init() {
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


    server.listen(8000, () => console.log("Server has been started"))
}
init();