import { Socket } from "socket.io-client";
import { LoadingPlayer } from "../Players/LoadingPlayer";
import { Room } from "./Room";

export class Loading extends Room<LoadingPlayer>{
    createPlayer(socket: Socket): LoadingPlayer {
        return new LoadingPlayer(socket, this);
    }
    
    async sync(){
        const sync = super.sync("loadingSync");
        sync.catch( (r) => console.error(r))
        await sync;
    }
}