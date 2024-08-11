import { Callback, Player } from "./player";

export abstract class EmitablePlayer<T extends string> extends Player{
    abstract event_callbacks: {
        [key in T]: Callback[];
    };

    on(event: T, callback: Callback){
        this.event_callbacks[event].push(callback)
    }

    emit(event: T, ...args: any[]){
        this.event_callbacks[event].forEach(  callback => callback(...args) );
    }
}