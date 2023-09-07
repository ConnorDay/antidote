import { Room } from "./room";
import { LobbySyncObject } from "../../../common/sync-objects";
import { Player } from "./player";

export class Lobby extends Room {

    ready_status: { [key: string]: boolean } = {}

    constructor(code: string) {
        super(code);
        this._listener_events.push("toggleReady");
    }

    /**
     * @override
     * @param player 
     * @param sync 
     */
    addPlayer(player: Player, sync?: boolean) {
        this.ready_status[player.id] = false;
        super.addPlayer(player, sync);
        player.socket.on("toggleReady", () => {
            this.ready_status[player.id] = !this.ready_status[player.id];
            console.log(`Player '${player.name}' has toggled ready to: '${this.ready_status[player.id]}'`);

            this.sync();
        });
    }

    sync() {
        const sync_list: LobbySyncObject[] = [];
        this.connected_players.forEach((player) => {
            sync_list.push({
                name: player.name,
                id: player.id,
                ready: this.ready_status[player.id]
            });
        });
        console.log(sync_list);
        this.emitAll("lobbySync", sync_list);
    }
}