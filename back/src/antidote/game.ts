import { Room } from "../game/room"
import { Formula, ActionType, HandQuery } from "../../../common/antidote-objects";
import { Card } from "../game/card";
import { PlayerStatusObject, GameSyncObject, ActionSyncObject } from "../../../common/sync-objects";
import { GamePlayer } from "./GamePlayer";
import { Socket } from "socket.io";
import { Deck } from "../game/deck";

export class Antidote extends Room {
    connected_players: GamePlayer[] = [];
    turn_order: GamePlayer[] = [];

    antidote?: Formula
    hands: { [key: string]: Card[] } = {};
    current_turn = 0;

    current_action?: ActionType;
    waiting_on: string[] = [];

    generatePlayer(name: string, socket: Socket): GamePlayer {
        return new GamePlayer(name, socket, this);
    }

    constructor(code: string) {
        super(code);
        console.log("Room 'Antidote' instantiated.");
    }

    addPlayer(player: GamePlayer, sync?: boolean) {
        super.addPlayer(player, sync);
        
        player.on("actionSelected", (action: ActionType, argument?: string) => {this.handleActionSelect(action, argument)} );
    }

    handleActionSelect( action: ActionType, argument?: string){
        this.current_action = action;
        switch (action){
            case "discard":
                this.handleDiscard();
                break;
            case "trade":
                break;
            case "use":
                break;
            case "pass":
                break;
            default:
                console.error(`Unhandled action '${action}' passed to game room.`)
        }
    }

    async handleDiscard(){
        const queries: Promise<Card|undefined>[] = [];
        this.connected_players.forEach( (player) => {
            const query = player.queryHand("Discard a card", false);

            query.then( (card) => {
                if (card === undefined){
                    throw `Invalid query response for Player '${player.name}'`;
                }

                player.discard(card);
                
                this.actionSync();
            });

            queries.push(query);
        });

        this.actionSync();

        await Promise.all(queries);

        this.updateTurn(this.current_turn + 1);
        this.sync();
    }

    sync() {
        if (this.connected_players.length === 0) {
            return;
        }

        this.connected_players.forEach((player) => {
            const status: PlayerStatusObject[] = [];
            this.turn_order.forEach((sub_player) => {
                if (sub_player.id === player.id){
                    return;
                }

                const is_turn = this.getCurrentPlayerTurnId() === player.id;
                status.push({
                    name: player.name,
                    id: player.id,
                    workstation: player.getHiddenWorkstation(),
                    is_turn: is_turn,
                });
            });

            const is_turn = this.getCurrentPlayerTurnId() === player.id;
            const sync: GameSyncObject = {
                players: status,
                hand: player.hand,
                workstation: player.workstation,
                is_turn: is_turn
            }
            player.socket.emit("gameSync", sync)
        });
    }

    actionSync() {
        const sync: ActionSyncObject = {
            waiting_on: this.getWaitingPlayers()
        }
        this.emitAll("actionSync", sync)
    }

    ready() {
        //Select antidote
        const x_cards: Formula[] = [
            "bootheide",
            "c9_tonic",
            "mx_vile",
            "oslers_oil",
            "rubiximab",
            "serum_n",
            "w2_rose",
        ];
        if (this.connected_players.length === 7) {
            x_cards.push("agent_u");
        }

        const random_index = Math.floor(Math.random() * x_cards.length);
        this.antidote = x_cards[random_index];
        console.log(`Selected ${this.antidote} as the antidote`)
        x_cards.splice(random_index, 1);

        const special_cards = new Deck<Card>();
        const number_cards = new Deck<Card>();
        x_cards.forEach((formula) => {
            special_cards.add(new Card(formula, "x"));
            for (let i = 0; i < this.connected_players.length; i++) {
                number_cards.add(new Card(formula, `${i + 1}`));
            }
        })

        for (let i = 0; i < this.connected_players.length; i++) {
            number_cards.add(new Card(this.antidote, `${i + 1}`));
        }

        const number_of_syringes = this.connected_players.length - (x_cards.length % this.connected_players.length);
        console.log(`Calculated number of syringes: ${number_of_syringes}`);

        for (let i = 0; i < number_of_syringes; i++) {
            special_cards.add(new Card("syringe"));
        }

        const special_hand_size = special_cards.length / this.connected_players.length;
        special_cards.shuffle();
        this.dealCards(special_cards, special_hand_size);

        number_cards.shuffle();
        this.dealCards(number_cards, x_cards.length + 1);

        this.connected_players.forEach( (player) => {
            this.turn_order.push(player);
        });

        this.updateTurn(Math.floor(Math.random() * this.connected_players.length));
    }

    updateTurn(turn_number: number) {
        while (turn_number < 0) {
            turn_number = this.connected_players.length + turn_number;
        }

        turn_number %= this.connected_players.length;
        this.current_turn = turn_number;

        console.log("Current turn number:",turn_number);
        const current_player = this.connected_players[turn_number];
        current_player.waiting = true;
        this.current_action = undefined;

        this.sync();
    }

    dealCards(cards: Deck<Card>, limit: number) {
        this.connected_players.forEach((player) => {
            cards.draw(limit).forEach( (card) => {
                player.hand.push(card);
            })
        })
    }

    getCurrentPlayerTurnId(){
        return this.turn_order[this.current_turn].id;
    }

    getWaitingPlayers(){
        const waiting: string[] = [];

        this.connected_players.forEach( player => {
            if (player.waiting){
                waiting.push(player.id);
            }
        });

        return waiting;
    }
}