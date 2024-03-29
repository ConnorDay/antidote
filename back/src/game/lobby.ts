import { Room } from "./room";
import { LobbySyncObject } from "../../../common/sync-objects";
import { Player } from "./player";
import { Loading } from "./loading";

const START_DELAY = 5 * 1000;

export class Lobby extends Room {

    ready_status: { [key: string]: boolean } = {};
    next_room: () => Room;
    private _round_start_timeout?: NodeJS.Timeout;

    constructor(code: string, room_factory: () => Room) {
        super(code);
        this._listener_events.push("toggleReady");
        this.next_room = room_factory;
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

            this.checkReady();
        });

        this.checkReady();
    }

    removePlayer(player: Player, sync?: boolean): void {
        super.removePlayer(player, sync);
        if (this.connected_players.length > 0) {
            this.checkReady();
        }
    }

    checkReady() {
        const all_ready = this.connected_players.every((player) => {
            return this.ready_status[player.id];
        });

        if (all_ready) {
            console.log(`All players in room '${this.code}' are ready. Starting round timer`);

            const startTime = Date.now() + START_DELAY;

            this.emitAll("roundTimerStart", startTime);

            this._round_start_timeout = setTimeout(() => {
                console.log(`Room '${this.code}' has started a round`);
                this.removeListeners();
                this._callbacks.change_to.forEach((callback) => {
                    callback(new Loading(this.code, this.next_room))
                });
            }, START_DELAY);
        } else if (this._round_start_timeout !== undefined) {
            console.log("A player has become unready, stopping round timer");

            clearTimeout(this._round_start_timeout);
            this._round_start_timeout = undefined;
            this.emitAll("roundTimerStop");
        }
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
        this.emitAll("lobbySync", sync_list);
    }

    ready() {
        this.sync();
    }
}