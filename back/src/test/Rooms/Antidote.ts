import { Socket } from "socket.io-client";
import { AntidotePlayer } from "../Players/AntidotePlayer";
import { Room } from "./Room";
import { ActionSyncObject } from "../../../../common/sync-objects";

export class Antidote extends Room<AntidotePlayer>{
    createPlayer(socket: Socket): AntidotePlayer {
        return new AntidotePlayer(socket, this);
    }

    async sync(){
        await super.sync("gameSync")
    }

    async allGotDiscard(){
        const promises: Promise<void>[] = [];

        this.players.forEach( (player) => {
            promises.push(player.gotDiscardQuery())
        });

        await Promise.all(promises);
    }

    async allGotActionSync(){
        const promises: Promise<ActionSyncObject>[] = [];

        this.players.forEach( (player) => {
            promises.push(player.gotActionSync())
        });

        await Promise.all(promises);
    }

    get current_player(): AntidotePlayer {
        const current = this.players.find( p => p.is_turn );
        if (current === undefined){
            throw "No current player";
        }

        return current;
    }
}