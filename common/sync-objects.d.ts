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

export interface CardObject {
    suit?: string;
    value?: string;
    id: string;
}
export interface PlayerStatusObject {
    name: string;
    id: string;
    has_played?: boolean;
    is_turn: boolean;
}
export interface GameSyncObject {
    players: PlayerStatusObject[];
    hand: CardObject[];
    is_turn: boolean;
}

export interface ActionSyncObject {
    message: string;
    waiting_on: string[];
}