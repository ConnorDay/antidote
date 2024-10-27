import { Player } from "../Players/Player";
import { io, Socket } from "socket.io-client";

export abstract class Room<PlayerType extends Player>{
    players: PlayerType[] = []

    abstract createPlayer(socket?: Socket, room?: Room<Player>): PlayerType

    addPlayer( player: PlayerType ){
        this.players.push(player)
    }

    async sync(sync_event: string ){
        const promises: Promise<void>[] = [];
        this.players.forEach( (player) => {
            promises.push( new Promise( (resolve, reject) => {
                player.once( sync_event, () => resolve() )
            }));
        });

        const all = Promise.all( promises );
        all.catch( reason => {
            console.error(reason);
        })
        await all;
    }

    async noneGetEvent(event_name: string){
        const promises: Promise<void>[] = [];
        this.players.forEach( player => {
            const not_emitted = player.doesNotGetEvent(event_name);
            promises.push(not_emitted);
        });

        await Promise.all(promises);
    }

    generateSocket(code: string) {
        return io(
            "ws://localhost:8000",
            {
                query: {
                    name: `player${this.players.length + 1}`,
                    code: code
                }
            }
        )
    }

    close(){
        this.players.forEach( player => {
            player.close();
        })
    }

    copyFrom(other: Room<Player>){
        other.players.forEach( other_player => {
            this.addPlayer( this.createPlayer(other_player.socket, other_player.room) );
        });
    }
}