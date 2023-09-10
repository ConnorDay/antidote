import { Card } from "../back/src/game/card";

export interface LobbySyncObject {
    name: string;
    id: string;
    ready: boolean;
}

export interface LoadingSyncObject {
    name: string;
    id: string;
    connected: boolean;
}

export interface PlayerStatusObject {
    name: string;
    id: string;
    has_played?: boolean;
    is_turn: boolean;
}
export interface GameSyncObject {
    players: PlayerStatusObject[];
    hand: Card[];
    is_turn: boolean;
}