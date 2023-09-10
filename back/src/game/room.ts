import { Socket } from "socket.io";
import { Player } from "./player";

export class PlayerAlreadyExists extends Error {
    constructor(player: Player) {
        super(`Player '${player.name}' is already connected to the room.`)
        this.name = "PlayerAlreadyExists"
    }
}

interface Callbacks {
    empty: Array<() => void>;
    change_to: Array<(new_room: Room) => void>;
}

export abstract class Room {
    connected_players: Player[] = [];
    disconnected_players: Player[] = [];
    code: string;

    protected _callbacks: Callbacks = {
        empty: [],
        change_to: [],
    };

    protected _listener_events: string[] = ["disconnected"];

    constructor(code: string) {
        this.code = code;
    }

    /**
     * Add a player to the room, attempts to revive disconnected players.
     * @param player the player to add to the room.
     * @throws {PlayerAlreadyExists} if the player name is already in connected_players
     */
    addPlayer(player: Player, sync: boolean = true) {
        const already_connected_player = this.connected_players.find((target_player) => {
            return target_player.name === player.name;
        });
        if (already_connected_player !== undefined) {
            throw new PlayerAlreadyExists(player);
        }

        const reconnecting_player = this.disconnected_players.find((target_player) => {
            return target_player.name === player.name;
        })
        if (reconnecting_player !== undefined) {
            console.log(`Player '${player.name}' is reconnecting`);
            player.copyFrom(reconnecting_player);

            //remove reconnecting player from disconnected_players
            this.disconnected_players = this.disconnected_players.filter((target_player) => {
                return target_player !== reconnecting_player;
            });
        }

        this.connected_players.push(player);

        player.socket.on("disconnect", () => {
            console.log(`Player '${player.name}' disconnected from '${this.code}'`);
            this.removePlayer(player);
        })

        if (sync) {
            this.sync();
        }
    }

    /**
     * Removes a player from the room.
     * @param player the player to remove
     */
    removePlayer(player: Player, sync: boolean = true) {
        this.connected_players = this.connected_players.filter((target_player) => {
            return target_player !== player;
        });

        this.disconnected_players.push(player)

        if (this.connected_players.length === 0) {
            this._callbacks.empty.forEach((callback) => {
                callback();
            })
        }

        if (sync) {
            this.sync();
        }
    }

    /**
     * Sends relevant sync information to all players
     */
    abstract sync(): void

    /**
     * Register callback functions from events
     * @param event the event to register
     * @param callback the function to call when the event triggers
     */
    on<K extends keyof Callbacks>(event: K, callback: Callbacks[typeof event][number]) {
        this._callbacks[event].push(callback as (...args: any[]) => void);
    }

    /**
     * clear all the listeners for the given event
     * @param event the event to clear listeners
     */
    clear(event: keyof Callbacks) {
        this._callbacks[event] = [];
    }

    /**
     * Copy all relevant information from the specified room
     * @param target_room the room to copy information from
     */
    copyFrom(target_room: Room) {
        target_room.connected_players.forEach((player) => {
            this.addPlayer(player, false);
        })
        target_room.disconnected_players.forEach((player) => {
            this.disconnected_players.push(player);
        });
    }

    /**
     * Remove listeners in _listener_events from all players
     */
    removeListeners() {
        this._listener_events.forEach((event) => {
            this.connected_players.forEach((player) => {
                player.socket.removeAllListeners(event);
            });
        });
    }

    /**
     * A method to be called after everything has been initialized in the room.
     * @virtual
     */
    ready() { }

    /**
     * Emit the same event over all connected players.
     * @param ev The event to emit over
     * @param args the arguments of the event
     */
    protected emitAll(ev: string, ...args: any[]) {
        this.connected_players.forEach((player) => {
            player.socket.emit(ev, ...args);
        })
    }
}