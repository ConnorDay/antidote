"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = exports.PlayerAlreadyExists = void 0;
class PlayerAlreadyExists extends Error {
    constructor(player) {
        super(`Player '${player.name}' is already connected to the room.`);
        this.name = "PlayerAlreadyExists";
    }
}
exports.PlayerAlreadyExists = PlayerAlreadyExists;
class Room {
    constructor(code) {
        this.connected_players = [];
        this.disconnected_players = [];
        this._callbacks = {
            empty: [],
        };
        this.code = code;
    }
    /**
     * Add a player to the room, attempts to revive disconnected players.
     * @param player the player to add to the room.
     * @throws {PlayerAlreadyExists} if the player name is already in connected_players
     */
    addPlayer(player) {
        const already_connected_player = this.connected_players.find((target_player) => {
            return target_player.name === player.name;
        });
        if (already_connected_player !== undefined) {
            throw new PlayerAlreadyExists(player);
        }
        const reconnecting_player = this.disconnected_players.find((target_player) => {
            return target_player.name === player.name;
        });
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
        });
    }
    /**
     * Removes a player from the room.
     * @param player the player to remove
     */
    removePlayer(player) {
        this.connected_players = this.connected_players.filter((target_player) => {
            return target_player !== player;
        });
        this.disconnected_players.push(player);
        if (this.connected_players.length === 0) {
            this._callbacks.empty.forEach((callback) => {
                callback();
            });
        }
    }
    /**
     * Register callback functions from events
     * @param event the event to register
     * @param callback the function to call when the event triggers
     */
    on(event, callback) {
        this._callbacks[event].push(callback);
    }
}
exports.Room = Room;
