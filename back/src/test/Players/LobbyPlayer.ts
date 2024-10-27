import { Socket } from "socket.io-client";
import { Player } from "./Player";
import { LobbySyncObject } from "../../../../common/sync-objects";
import { Lobby } from "../Rooms/Lobby";

export class LobbyPlayer extends Player{
    room!: Lobby;
    ready = false;
    constructor(socket: Socket, room: Lobby){
        super(socket, room);
        socket.on("lobbySync", ( sync: LobbySyncObject[] ) => { this.lobbySync(sync) });
        socket.on("error", (reason: any) => this.emit("errors", reason));
        socket.on("roundTimerStart", () => this.gotTimerStart());
        socket.on("roundTimerStop", () => this.gotTimerStop());
    }

    toggleReady(){
        this.ready = !this.ready;
        this.socket.emit("toggleReady");
    }

    toggleTimer(){
        this.socket.emit("toggleTimer");
    }

    async gotTimerStart(){
        return new Promise<number>( (resolve, reject) =>{
            this.socket.once("roundTimerStart", (time: number) => resolve(time));
        });
    }

    async gotTimerStop(){
        return new Promise<void>( (resolve, reject) =>{
            this.socket.once("roundTimerStop", () => resolve());
        });
    }

    async gotNewRoom(){
        return new Promise<void>( (resolve, reject) => {
            this.socket.once("roomChange", () => {
                resolve();
            });
        });
    }

    lobbySync( sync: LobbySyncObject[] ){
        expect(sync).toBeDefined();
        expect(sync.length).toBe(this.room.players.length);

        sync.forEach((record, index) => {
            expect(record.name).toBe(`player${index + 1}`);
            expect(record.ready).toBe(this.room.players[index].ready);
            expect(record.id).toBeDefined();
        });

        this.emit("lobbySync");
    }
}