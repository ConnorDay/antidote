import { Socket } from "socket.io";
import { Card } from "../game/card";
import { Antidote } from "./game";
import { HandQuery, TurnActionObject, TurnSelectObject } from "../../../common/antidote-objects";
import { EmittablePlayer } from "../game/EmittablePlayer";

type events = "actionCompleted" | "actionSelected" | "tradeResponse";

export class GamePlayer extends EmittablePlayer<events> {
    event_callbacks = {
        actionCompleted: [],
        actionSelected: [],
        tradeResponse: []
    }

    hand: Card[] = [];
    workstation: Card[] = [];
    waiting = false;
    room: Antidote

    constructor(name: string, socket: Socket, room: Antidote) {
        super(name, socket, room)
        this.room = room;

        this.socket.on("turnSelect", (select: TurnSelectObject) => this.handleTurnSelect(select))
        this.socket.on("resync", () => this.handleResync())
    }

    handleResync(){
        this.room.sync();
    }

    handleTurnSelect(select: TurnSelectObject) {
        console.log(`Got a turn select from '${this.name}', action: ${select.action}, argument: ${select.argument}`)
        if ( this.room.getCurrentPlayerTurnId() != this.id ){
            console.log(`Current turn does not belong to Player '${this.name}'`);
            this.socket.emit("error", { message: "Not your turn." });
            return;
        }

        if (this.room.current_action !== undefined) {
            console.log(`Player '${this.name}' sent a valid select, but an select is already set.`)
            this.socket.emit("error", { message: "Valid select, but game already has an select designated" });
            return;
        }

        switch (select.action) {
            case "discard":
                this.handleDiscardAction();
                break;
            case "trade":
                this.handleTradeAction(select.argument);
                break;
            case "use":
                this.handleUseAction(select.argument, select.argument2, select.argument3);
                break;
            case "pass":
                this.handlePassAction(select.argument);
                break;
            default:
                console.error("Unhandled action passed.");
                this.socket.emit("error", {message: "Unhandled action passed."});
                break;
        }
    }

    handleDiscardAction() {
        this.emit("actionSelected", "discard")
    }
    handlePassAction( direction?: string){
        if (direction === undefined){
            console.warn(`Player '${this.name}' did not provide a direction`);
            this.socket.emit("error", {message: "No direction provided"});
            return;
        }
        if (direction !== "left" && direction !== "right"){
            console.warn(`Player '${this.name}' did not provide a valid direction: ${direction}`);
            this.socket.emit("error", {message: `'${direction}' is not a valid direction`});
            return;
        }
        this.emit("actionSelected", "pass", direction);
    }
    handleTradeAction(target?: string) {
        if (target === undefined){
            console.error(`Player '${this.name}' did not provide a target`);
            this.socket.emit("error", {message: "No target provided"});
            return;
        }

        const target_player = this.room.connected_players.find(p => p.id === target);
        if (target_player === undefined){
            console.warn(`Could not find a player id with id '${target}'`);
            this.socket.emit("error", {message: `Could not find a player id with id '${target}'`});
            return;
        }

        console.log(`Player '${this.name}' initiated a trade request with Player '${target_player.name}'`)
        this.waiting = false;
        this.emit("actionSelected", "trade", target);
        
    }
    handleUseAction(card?: string, target_type?: string, target_id?: string) {
        if (card === undefined || card === null){
            console.error(`Player '${this.name}' did not provide a card`);
            this.socket.emit("error", {message: "No card provided"});
            return;
        }
        const found_card = this.hand.find(c => c.id === card);
        if (found_card === undefined) {
            console.error(`Could not find a card with id '${card}' in the hand of Player '${this.name}'`);
            this.socket.emit("error", {message: "Could not find provided card"});
            return;
        }
        const playable_cards = ["syringe"];
        if ( found_card.suit === undefined || !playable_cards.includes( found_card.suit) ){
            console.error(`Player '${this.name}' attempted to play a card with suit '${found_card.suit}'`);
            this.socket.emit("error", {message: "Invalid card"});
            return;
        }

        if (target_type === undefined || card === null){
            console.error(`Player '${this.name}' did not provide a target type`);
            this.socket.emit("error", {message: "No target type provided"});
            return;
        }
        if (target_type !== "card" && target_type !== "player"){
            console.error(`Player '${this.name}' provided an invalid target type '${target_type}'`);
            this.socket.emit("error", {message: "Invalid target type"});
            return;
        }

        if (target_id === undefined || card === null){
            console.error(`Player '${this.name}' did not provide a target id`);
            this.socket.emit("error", {message: "No target id provided"});
            return;
        }

        this.emit("actionSelected", "use", card, target_type, target_id)

    }

    discard( card: Card ){
        const index = this.hand.indexOf(card);
        if (index < 0){
            throw `Attempted to discard Card '${card.id}' from Player '${this.name}', but does not exist in hand.`;
        }

        this.hand.splice( index, 1 );
    }

    async queryHand(message: string, can_reject: boolean, destination?: string){
        console.log(`Sending hand query to Player '${this.name}'`);
        return new Promise<Card|undefined>( ( accept, reject ) => {
            const responseCallback = ( card_id: string|null ) => {
                console.log(`Got a query hand response from Player '${this.name}': '${card_id}'`)
                if (card_id === null && !can_reject){
                    console.warn(`Player '${this.name}' attempted to reject an unrejectable query.`)
                    this.socket.emit("error", "cannot reject this request.");
                    return;
                }

                let target_card = undefined;

                if (card_id !== null){
                    target_card = this.hand.find(c => c.id === card_id);
                    if (target_card === undefined) {
                        console.warn(`Could not find card with id '${card_id}' for Player '${this.name}'`);
                        this.socket.emit("error", {message: `Could not find card with id '${card_id}'`});
                        return;
                    }
                }

                this.waiting = false
                this.socket.off("handResponse", responseCallback);
                accept(target_card);
            }

            this.socket.on("handResponse", responseCallback);
            const query: HandQuery = {
                message,
                can_reject,
                destination
            }
            this.waiting = true;
            this.socket.emit("handQuery", query);
        });
    }

    getHiddenWorkstation(){
        const hidden: Card[] = [];
        this.workstation.forEach( card => {
            const new_card = new Card();
            new_card.id = card.id;
            if (card.value !== "x") {
                new_card.suit = card.suit;
                new_card.value = card.value;
            }

            hidden.push(new_card);
        });

        return hidden;
    }
}