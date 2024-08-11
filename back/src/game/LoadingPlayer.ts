import { Socket } from "socket.io";
import { Loading } from "./loading";
import { EmitablePlayer } from "./EmitablePlayer";

type Events = "loaded" | "fegli";

export class LoadingPlayer extends EmitablePlayer<Events> {
    room!: Loading;
    loaded: boolean = false;
    event_callbacks = {
        loaded: [],
        fegli: []
    }

    constructor(name: string, socket: Socket, room: Loading){
        super(name, socket, room);

        this.socket.on("loaded", () => this.onLoaded());
        this.socket.emit("startLoading");
    }

    onLoaded(){
            console.log("got a loaded message");
            if (this.loaded) {
                console.warn(`Player '${this.name}' attempted to connect to room '${this.room.code}', but was already connected`);
                return;
            }

            console.log(`Player '${this.name}' has connected to room '${this.room.code}'`);
            this.loaded = true;


            this.emit("loaded");
            // this.emit()
            
            // this.sync();

            // const all_players_connected = this.connected_players.every((player) => {
            //     return this.connected_status[player.id];
            // });
            // if (all_players_connected) {
            //     this._callbacks.change_to.forEach((callback) => {
            //         callback(this.next_room());
            //     });
            // }
    }


}