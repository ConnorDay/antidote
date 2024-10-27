import {Socket} from "socket.io-client";
import { Room } from "../Rooms/Room";
import { expect } from "@jest/globals";
import { EventEmitter } from "node:events";

export class Player extends EventEmitter{
    socket: Socket;
    room: Room<Player>;

    constructor( socket: Socket, room: Room<Player> ){
        super();
        this.socket = socket;
        this.room = room;
    }

    close(){
        this.socket.close();
    }

    async doesNotGetEvent(event_name: string){
        return new Promise<void>( (resolve, reject) => {
            let timer: NodeJS.Timeout;
            const listener = () => {
                clearTimeout(timer);
                reject();
            }
            timer = setTimeout(() => {
                this.socket.off(event_name, listener);
                resolve();
            }, 500);
            this.socket.once(event_name, listener);
        });
    }

    async getError(){
        return new Promise<any>( (resolve, reject) => {
            this.socket.once("error", (reason) => resolve(reason));
        });
    }
}