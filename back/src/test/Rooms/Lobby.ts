import { LobbyPlayer } from "../Players/LobbyPlayer";
import { Room } from "./Room";

export class Lobby extends Room<LobbyPlayer>{
    createPlayer(): LobbyPlayer {
        return new LobbyPlayer( this.generateSocket("1234"), this );
    }

    async newRoom( min_time: number ){
        const promises: Promise<void>[] = [];

        this.players.forEach( player => {
            const promise = player.gotNewRoom();
            promise.then( () => {
                expect(Date.now()).toBeGreaterThanOrEqual(min_time);
            });
            promises.push(promise);
        });

        await Promise.all(promises);
    }

    async roundTimerStarted(){
        const promises: Promise<number>[] = [];

        let time: number = -1;

        this.players.forEach( (player) => {
            const promise = player.gotTimerStart()
            promise.then( (t) => {
                if (time === -1) {
                    time = t;
                }

                expect(t).toBe(time);
            });
            promises.push(promise);
        });


        await Promise.all( promises );
        expect(time).not.toBe(-1);
        return time;
    }

    async roundTimerStopped(){
        const promises: Promise<void>[] = [];
        this.players.forEach( (player) => {
            promises.push( player.gotTimerStop() );
        });

        await Promise.all( promises );
    }

    async sync(){
        return super.sync("lobbySync");
    }
}