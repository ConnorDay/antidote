import { Socket } from "socket.io";
import { randomUUID } from "crypto";
import { Room } from "./room";

export type Callback = (...args: any[]) => any;

export abstract class Player{
    name: string;
    socket: Socket;
    id: string;
    room: Room;

    constructor(name: string, socket: Socket, room: Room) {
        this.name = name;
        socket.removeAllListeners();
        this.socket = socket;
        this.room = room;
        this.id = randomUUID();

        socket.on("disconnect", (reason) => {
            console.log(`Player '${this.name}' disconnected from '${room.code}'`);
            this.room.removePlayer(this);
        });
    }

    /**
     * copies all relevant information from the target player to this instance.
     * @param target_player the player to copy information from
     */
    copyFrom(target_player: Player) {
        this.id = target_player.id;
    }
}