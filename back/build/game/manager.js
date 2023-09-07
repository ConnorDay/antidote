"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Manager = void 0;
const player_1 = require("./player");
const room_1 = require("./room");
;
class Manager {
    constructor(io) {
        this.all_rooms = {};
        io.on("connection", (socket) => {
            const name = socket.handshake.query.name;
            if (name === undefined || name === "" || Array.isArray(name)) {
                socket.emit("error", {
                    message: "Name was not in expected format"
                });
                socket.disconnect();
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
            this.registerConnection(code, name, socket);
        });
    }
    /**
     * Adds a player to a room, or creates a new room if it doesn't exist.
     * @param code The room code to connect to.
     * @param name The name of the connecting player.
     * @param socket The socket that the player used to connect.
     */
    registerConnection(code, name, socket) {
        console.log(`Player '${name}' connected to room '${code}'`);
        let target_room = this.all_rooms[code];
        if (target_room === undefined) {
            console.log(`No room found for code '${code}'. Creating a new room.`);
            target_room = new room_1.Room(code);
            this.all_rooms[code] = target_room;
            target_room.on("empty", () => {
                console.log(`Removing empty room '${code}'`);
                this.all_rooms[code] = undefined;
            });
        }
        const new_player = new player_1.Player(name, socket);
        try {
            target_room.addPlayer(new_player);
        }
        catch (PlayerAlreadyExists) {
            console.log(`Player '${name}' already exists in room '${code}'`);
            socket.emit("error", {
                message: `Player with name '${name}' already exists in room '${code}'`
            });
            socket.disconnect();
        }
    }
}
exports.Manager = Manager;
