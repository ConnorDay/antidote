import { Socket, Server } from "socket.io";
import { Player } from "./player";
import { Room } from "./room";
import { LobbyPlayer } from "./LobbyPlayer";
import { Lobby } from "./lobby";

interface RoomDictionary {
    [key: string]: Room | undefined;
};

export class Manager {
    all_rooms: RoomDictionary = {};

    constructor(io: Server) {

    }

    /**
     * Adds a player to a room, or creates a new room if it doesn't exist.
     * @param code The room code to connect to.
     * @param name The name of the connecting player.
     * @param socket The socket that the player used to connect.
     */
    registerConnection(code: string, name: string, socket: Socket, room_factory: () => Room) {
        console.log(`Player '${name}' connected to room '${code}'`);

        let target_room = this.all_rooms[code];
        if (target_room === undefined) {
            console.log(`No room found for code '${code}'. Creating a new room.`);

            target_room = room_factory();
            this.all_rooms[code] = target_room;

            this.registerListeners(target_room);
        }
        const new_player = target_room.generatePlayer(name, socket);
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

    /**
     * register all listeners needed to the given room
     * @param room the room to register listeners
     */
    registerListeners(room: Room) {
        room.on("empty", () => {
            console.log(`Removing empty room '${room.code}'`);
            this.all_rooms[room.code] = undefined;
        });

        room.on("change_to", (new_room) => {
            console.log(`Changing room '${room.code}' to a new Room`)
            this.removeListeners(room);
            this.registerListeners(new_room);
            this.all_rooms[room.code] = new_room;
            new_room.copyFrom(room);
            room.removeListeners();
            new_room.ready();
        });
    }

    /**
     * remove all listeners from room
     * @param room the room to remove listeners from
     */
    removeListeners(room: Room) {
        room.clear("empty");
        room.clear("change_to");
    }
}