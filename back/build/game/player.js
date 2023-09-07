"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const crypto_1 = require("crypto");
class Player {
    constructor(name, socket) {
        this.name = name;
        this.socket = socket;
        this.id = (0, crypto_1.randomUUID)();
    }
    /**
     * copies all relevant information from the target player to this instance.
     * @param target_player the player to copy information from
     */
    copyFrom(target_player) {
        this.id = target_player.id;
    }
}
exports.Player = Player;
