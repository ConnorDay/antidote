import { Socket } from "socket.io";
import { randomUUID } from "crypto";

export class Player {
    name: string;
    socket: Socket;
    id: string;

    constructor( name: string, socket: Socket ) {
        this.name = name;
        this.socket = socket;
        this.id = randomUUID();
    }

    /**
     * copies all relevant information from the target player to this instance.
     * @param target_player the player to copy information from
     */
    copyFrom( target_player: Player ) {
        this.id = target_player.id;
    }
}