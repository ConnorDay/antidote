import { Socket } from "socket.io-client";
import { Antidote } from "../Rooms/Antidote";
import { Player } from "./Player";
import { GameSyncObject, CardObject, ActionSyncObject } from "../../../../common/sync-objects";
import { ActionType, HandQuery, TurnSelectObject } from "../../../../common/antidote-objects";

export class AntidotePlayer extends Player{
    room!: Antidote
    hand: CardObject[] = []
    workstation: CardObject[] = [];
    id: string = "";
    is_turn: boolean = false;
    waiting = false;

    constructor(socket: Socket, room: Antidote){
        super(socket, room);
        socket.on("gameSync", (sync: GameSyncObject) => {
            this.gameSync(sync);
        });
        socket.on("actionSync", (sync: ActionSyncObject) => {
            this.actionSync(sync);
        })
    }

    async gotHandQuery() {
        return new Promise<HandQuery>( (resolve) => {
            this.socket.once("handQuery", (query: HandQuery) => {
                resolve(query);
            });
        });
    }

    async gotDiscardQuery() {
        const query = await this.gotHandQuery();

        expect(query.can_reject).toBe(false);
        expect(query.message).toBe("Discard a card");
        expect(query.destination).toBe(undefined);
    }

    async gotActionSync() {
        return new Promise<ActionSyncObject>( (resolve) => {
            this.once("actionSync", (sync: ActionSyncObject) => resolve(sync));
        });
    }

    getRegularCard(){
        const card = this.hand.find( c => {
            return c.suit != "syringe" && c.value != "x";
        });

        if (card === undefined){
            throw "unable to find regular card."
        }

        return card;
    }

    handResponse( card_id: string ){
        this.waiting = false;
        this.socket.emit("handResponse", card_id)
    }

    selectTurnAction(action: ActionType){
        const object: TurnSelectObject = {
            action: action
        }

        this.socket.emit("turnSelect", object);
    }
    selectDiscard(){
        this.selectTurnAction("discard");
    }

    actionSync( sync: ActionSyncObject ){
        if (sync.waiting_on.includes(this.id)) {
            this.waiting = true
        }
        this.emit("actionSync", sync)
    }

    gameSync( sync: GameSyncObject ){
        this.hand = sync.hand;
        expect(sync.hand.length).toBeGreaterThan(0);
        this.id = sync.id;
        expect(sync.id).toBeDefined();
        this.workstation = sync.workstation;
        expect(sync.workstation.length).toBeGreaterThanOrEqual(0);
        this.is_turn = sync.is_turn;
        expect(sync.is_turn).toBeDefined()

        this.emit("gameSync");
    }
}