import { Socket } from "socket.io-client";
import { Loading } from "../Rooms/Loading";
import { Player } from "./Player";
import { LoadingSyncObject } from "../../../../common/sync-objects";

export class LoadingPlayer extends Player{
    room!: Loading;
    connected = false;
    constructor(socket: Socket, room: Loading){
        super(socket, room)
        socket.on("loadingSync", ( sync: LoadingSyncObject[] ) => { 
            this.loadingSync(sync) 
        });
    }

    async gotError(){
        return new Promise<any>( (resolve, reject) =>{
            this.socket.once("error", (reason: any) => resolve(reason));
        });
    }

    setLoaded(){
        this.connected = true;
        this.socket.emit("loaded");
    }

    loadingSync( sync: LoadingSyncObject[] ){
        expect(sync).toBeDefined();
        expect(sync.length).toBe(this.room.players.length);

        sync.forEach((record, index) => {
            expect(record.name).toBe(`player${index + 1}`);
            expect(record.connected).toBe(this.room.players[index].connected);
            expect(record.id).toBeDefined();
        });

        this.emit("loadingSync");
    }
}