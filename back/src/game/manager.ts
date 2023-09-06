import { Socket, Server } from "socket.io";
import { Player } from "./player";
import { Room } from "./room";

interface RoomDictionary {
    [key: string]: Room | undefined;
};

export class Manager {
    all_rooms: RoomDictionary = {};

    constructor(io: Server) {

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

            this.registerConnection(code, name, socket);
        })
    }

    /**
     * Adds a player to a room, or creates a new room if it doesn't exist.
     * @param code The room code to connect to.
     * @param name The name of the connecting player.
     * @param socket The socket that the player used to connect.
     */
    registerConnection(code: string, name: string, socket: Socket) {
        console.log(`Player '${name}' connected to room '${code}'`);

        let target_room = this.all_rooms[code];
        if (target_room === undefined) {
            console.log(`No room found for code '${code}'. Creating a new room.`);

            target_room = new Room(code);
            this.all_rooms[code] = target_room;
            target_room.on("empty", () => {
                console.log(`Removing empty room '${code}'`);
                this.all_rooms[code] = undefined;
            });
        }

        const new_player = new Player(name, socket);
        try {
            target_room.addPlayer(new_player);
        } catch (PlayerAlreadyExists) {
            console.log(`Player '${name}' already exists in room '${code}'`);
            socket.emit("error", {
                message: `Player with name '${name}' already exists in room '${code}'`
            })
            socket.disconnect();
        }
    }
}