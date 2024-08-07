import { Player } from "./player";
import { Room } from "./room";
import { LoadingSyncObject } from "../../../common/sync-objects";
import { LoadingPlayer } from "./LoadingPlayer";
import { Socket } from "socket.io";

export class Loading extends Room {
    connected_status: { [key: string]: boolean } = {};
    next_room: () => Room;

    generatePlayer(name: string, socket: Socket): LoadingPlayer {
        return new LoadingPlayer(name, socket, this);
    }

    constructor(code: string, next_room: () => Room) {
        super(code);

        console.log("Room 'Loading' instantiated.");

        this._listener_events.push("loaded");
        this.next_room = next_room;
    }

    /**
     * @override
     */
    addPlayer(player: Player, sync?: boolean) {
        super.addPlayer(player, sync);

        this.connected_status[player.id] = false;

        player.socket.on("loaded", () => {
            console.log("got a loaded message");
            if (this.connected_status[player.id] === true) {
                console.warn(`Player '${player.name}' attempted to connect to room '${this.code}', but was already connected`);
                return;
            }

            console.log(`Player '${player.name}' has connected to room '${this.code}'`);
            this.connected_status[player.id] = true
            this.sync();

            const all_players_connected = this.connected_players.every((player) => {
                return this.connected_status[player.id];
            });
            if (all_players_connected) {
                this._callbacks.change_to.forEach((callback) => {
                    callback(this.next_room());
                });
            }
        });

        player.socket.emit("startLoading");
    }

    sync() {
        const sync_list: LoadingSyncObject[] = [];
        this.connected_players.forEach((player) => {
            sync_list.push({
                name: player.name,
                id: player.id,
                connected: this.connected_status[player.id],
            });
        });
        this.emitAll("loadingSync", sync_list);
    }

    ready() {
        this.sync();
    }
}