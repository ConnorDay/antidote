import { Socket } from "socket.io";
import { Lobby } from "./lobby";
import { EmitablePlayer } from "./EmitablePlayer";
import { Callback } from "./player";

export class LobbyPlayer extends EmitablePlayer<"toggleReady"|"toggleTimer">{
    event_callbacks = {
        toggleReady: [],
        toggleTimer: []
    }
    room: Lobby
    ready: boolean = false;
    constructor(name: string, socket: Socket, room: Lobby) {
        super(name, socket, room);
        this.room = room;

        this.socket.on("toggleReady", () => this.onToggleReady());
        this.socket.on("toggleTimer", () => this.onToggleTimer());
    }
    onToggleReady() {
        this.ready = !this.ready;
        console.log(`Player '${this.name}' has toggled ready to: '${this.ready}'`);
        this.emit("toggleReady")
    }
    onToggleTimer() {
        console.log(`Player '${this.name}' attempted to start the lobby timer`);
        const host_id = this.room.connected_players[0].id;
        if (host_id !== this.id) {
            this.socket.emit("error", {
                message: "only the host is able to toggle the round timer"
            });
            console.log(`\tPlayer '${this.name}' is not the host`);
            return;
        }

        if (!this.room.all_ready) {
            this.socket.emit("error", {
                message: "not all players are ready"
            });
            console.log(`\tNot all players in Room '${this.room.code}' are ready.`);
            return;
        }

        this.emit("toggleTimer");
    }
}