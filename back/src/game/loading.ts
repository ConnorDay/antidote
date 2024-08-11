import { Player } from "./player";
import { Room } from "./room";
import { LoadingSyncObject } from "../../../common/sync-objects";
import { LoadingPlayer } from "./LoadingPlayer";
import { Socket } from "socket.io";

export class Loading extends Room {
    next_room: () => Room;

    connected_players: LoadingPlayer[] = [];

    generatePlayer(name: string, socket: Socket): LoadingPlayer {
        return new LoadingPlayer(name, socket, this);
    }

    constructor(code: string, next_room: () => Room) {
        super(code);

        console.log("Room 'Loading' instantiated.");

        // this._listener_events.push("loaded");
        this.next_room = next_room;
    }

    /**
     * @override
     */
    addPlayer(player: LoadingPlayer, sync?: boolean) {
        super.addPlayer(player, sync);

        player.on("loaded", () => this.handlePlayerLoad());

    }

    /**
     * @handler 
     */
    handlePlayerLoad(){
        this.sync();
        const all_players_connected = this.connected_players.every((player) => {
            return player.loaded;
        });
        if (all_players_connected) {
            this._callbacks.change_to.forEach((callback) => {
                callback(this.next_room());
            });
        }
        
    }

    sync() {
        const sync_list: LoadingSyncObject[] = [];
        this.connected_players.forEach((player) => {
            sync_list.push({
                name: player.name,
                id: player.id,
                connected: player.loaded
            });
        });
        this.emitAll("loadingSync", sync_list);
    }

    ready() {
        this.sync();
    }
}