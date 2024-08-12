import { Room } from "../game/room"
import { Formula, ActionType, TurnActionObject, HandQuery } from "../../../common/antidote-objects";
import { Card } from "../game/card";
import { PlayerStatusObject, GameSyncObject, ActionSyncObject } from "../../../common/sync-objects";
import { Player } from "../game/player";
import { GamePlayer } from "./GamePlayer";
import { Socket } from "socket.io";
import { Deck } from "../game/deck";

export class Antidote extends Room {
    connected_players: GamePlayer[] = [];

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

    addPlayer(player: Player, sync?: boolean) {
        super.addPlayer(player, sync);

        player.socket.on("turnAction", (action: TurnActionObject) => {
            console.log(`Got a turn action from '${player.name}'`)
            const current_turn_id = this.connected_players[this.current_turn].id;
            if (current_turn_id !== player.id) {
                player.socket.emit("error", {
                    message: "Not your turn."
                })
                console.log(`Current turn does not belong to Player '${player.name}'`);
                return;
            }

            if (this.current_action !== undefined) {
                console.log(`Player '${player.name}' sent a valid action, but an action is already set.`)
                return;
            }

            if (action.action === "trade") {
                if (action.argument !== "left" && action.argument !== "right") {
                    if (action.argument === player.id) {
                        console.log(`Player '${player.name}' tried to trade with themselves.`)
                        player.socket.emit("error", {
                            message: "Cannot trade with yourself"
                        });
                        return;
                    }

                    const target_player = this.connected_players.find(player => player.id === action.argument);
                    if (target_player === undefined) {
                        console.log(`Unable to find player with id '${action.argument}'`)
                        player.socket.emit("error", {
                            message: `Unable to find player with id '${action.argument}'`
                        });
                        return;
                    }

                    console.log(`Player '${player.name}' wants to trade with '${target_player.name}'`);
                    const query: HandQuery = {
                        message: `${player.name} would like to trade.`,
                        can_reject: true,
                        destination: player.name,
                    }
                    target_player.socket.emit("handQuery", query)

                    target_player.socket.once("handQueryResponse", (response?: string) => {
                        console.log(`Got a query response from '${target_player.name}'`);
                        if (response === undefined) {
                            console.log(`Player '${target_player.name}' has rejected the trade offer`);
                            this.current_action = undefined;
                            this.waiting_on = [player.id];
                            this.actionSync(`Player '${target_player.name}' has rejected the trade offer`);
                            return;
                        }
                    });
                    this.current_action = "trade";
                    this.waiting_on = [target_player.id];
                    this.actionSync(`Player '${player.name}' wants to trade with '${target_player.name}'`);
                    return;
                }

                const query: HandQuery = {
                    message: `${player.name} decided to trade research`,
                    can_reject: false,
                    destination: action.argument,
                }

                this.waiting_on = [];
                this.connected_players.forEach((player) => {
                    this.waiting_on.push(player.id)
                });

                this.emitAll("handQuery", query);
            }
        });
    }

    removePlayer(player: Player, sync?: boolean): void {

    }

    sync() {
        if (this.connected_players.length === 0) {
            return;
        }

        const status: PlayerStatusObject[] = [];
        this.connected_players.forEach((player) => {
            const is_turn = this.connected_players[this.current_turn].id === player.id;
            status.push({
                name: player.name,
                id: player.id,
                is_turn: is_turn,
            });
        });
        this.connected_players.forEach((player) => {
            const is_turn = this.connected_players[this.current_turn].id === player.id;
            player.socket.emit("gameSync", {
                players: status,
                hand: player.hand,
                is_turn: is_turn,
            })
        });
    }

    actionSync(message: string) {
        const sync: ActionSyncObject = {
            message,
            waiting_on: this.waiting_on,
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

        this.connected_players.forEach((player) => {
            this.hands[player.id] = [];
        });

        const special_hand_size = special_cards.length / this.connected_players.length;
        special_cards.shuffle();
        this.dealCards(special_cards, special_hand_size);

        number_cards.shuffle();
        this.dealCards(number_cards, x_cards.length + 1);

        this.updateTurn(Math.floor(Math.random() * this.connected_players.length));
    }

    updateTurn(turn_number: number) {
        if (turn_number < 0) {
            turn_number = this.connected_players.length + turn_number;
        }

        turn_number %= this.connected_players.length;
        this.current_turn = turn_number;

        console.log("Current turn number:",turn_number);
        const current_player = this.connected_players[turn_number];
        this.waiting_on = [current_player.id];

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
        return this.connected_players[this.current_turn].id;
    }
}