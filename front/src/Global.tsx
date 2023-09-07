import { Socket } from "socket.io-client";

export type ConnectionInfo = {
    name: string;
    code: string;
};

export enum Pages {
    Homepage,
    Lobby
}

type Global = {
    connectionInfo: ConnectionInfo;
    socket: Socket;

    setDisplay: React.Dispatch<React.SetStateAction<Pages>>;
};

const Global: Global = {} as Global;

export { Global };