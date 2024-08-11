import { Room } from "./room";
import { LobbySyncObject } from "../../../common/sync-objects";
import { Loading } from "./loading";
import { LobbyPlayer } from "./LobbyPlayer";
import { Socket } from "socket.io";

const START_DELAY = 5 * 1000;

export class Lobby extends Room {

    connected_players: LobbyPlayer[] = [];

    private next_room: () => Room;
    private _round_start_timeout?: NodeJS.Timeout;

    generatePlayer(name: string, socket: Socket): LobbyPlayer {
        return new LobbyPlayer(name, socket, this);
    }

    constructor(code: string, room_factory: () => Room) {
        super(code);
        this.next_room = room_factory;
    }

    /**
     * @override
     * @param player 
     * @param sync 
     */
    addPlayer(player: LobbyPlayer, sync?: boolean) {
        super.addPlayer(player, sync);

        player.on("toggleReady", () => {this.onToggleReady()})
        player.on("toggleTimer", () => {this.onToggleTimer()})
    }

    removePlayer(player: LobbyPlayer, sync?: boolean): void {
        super.removePlayer(player, sync);
        if (this._round_start_timeout !== undefined) {
            console.log(`A player left while the round timer was started for room '${this.code}. Cancelling timer.'`);
            clearTimeout(this._round_start_timeout);
            this._round_start_timeout = undefined;
            this.emitAll("roundTimerStop");
        }
    }

    onToggleReady(){
        this.sync();
        this.checkReady();
    }

    onToggleTimer() {
        if (this._round_start_timeout === undefined) {
            console.log(`All players in room '${this.code}' are ready and host has started round timer`);

            const startTime = Date.now() + START_DELAY;

            this.emitAll("roundTimerStart", startTime);

            this._round_start_timeout = setTimeout(() => {
                console.log(`Room '${this.code}' has started a round`);
                this._callbacks.change_to.forEach((callback) => {
                    callback(new Loading(this.code, this.next_room));
                });

                this.emitAll("roomChange");
            }, START_DELAY);
        } else {
            console.log(`Cancelling timer for room '${this.code}'.`)
            clearTimeout(this._round_start_timeout);
            this._round_start_timeout = undefined;
            this.emitAll("roundTimerStop");
        }
    }

    checkReady() {
        if (!this.all_ready && this._round_start_timeout !== undefined) {
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
                ready: player.ready,
            });
        });
        this.checkReady();
        this.emitAll("lobbySync", sync_list);
    }

    ready() {
        this.sync();
    }

    get all_ready() {
        return this.connected_players.every((player) => {
            return player.ready;
        })
    }
}