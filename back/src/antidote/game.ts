import { Room } from "../game/room"
import { Formula, SpecialCards } from "../../../common/antidote-objects";
import { Card } from "../game/card";
import { PlayerStatusObject, GameSyncObject } from "../../../common/sync-objects";
import { Player } from "../game/player";

export class Antidote extends Room {
    antidote?: Formula
    hands: { [key: string]: Card[] } = {};
    current_turn = 0;

    constructor(code: string) {
        super(code);
        console.log("Room 'Antidote' instantiated.");
    }

    addPlayer(player: Player, sync?: boolean) {
        super.addPlayer(player, sync);
    }

    sync() {
        const to_sync: GameSyncObject[] = [];
        const status: PlayerStatusObject[] = [];
        this.connected_players.forEach((player) => {
            const is_turn = this.connected_players[this.current_turn].id === player.id;
            status.push({
                name: player.name,
                id: player.id,
                is_turn: is_turn,
            });

            to_sync.push({
                players: status,
                hand: this.hands[player.id],
                is_turn: is_turn,
            });
        });

        this.emitAll("gameSync", to_sync);
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

        const special_cards: Card[] = [];
        const number_cards: Card[] = [];
        x_cards.forEach((formula) => {
            special_cards.push(new Card(formula, "x"));
            for (let i = 0; i < this.connected_players.length; i++) {
                number_cards.push(new Card(formula, `${i + 1}`));
            }
        })

        for (let i = 0; i < this.connected_players.length; i++) {
            number_cards.push(new Card(this.antidote, `${i + 1}`));
        }

        const number_of_syringes = this.connected_players.length - (x_cards.length % this.connected_players.length);
        console.log(`Calculated number of syringes: ${number_of_syringes}`);

        for (let i = 0; i < number_of_syringes; i++) {
            special_cards.push(new Card("syringe"));
        }

        this.connected_players.forEach((player) => {
            this.hands[player.id] = [];
        });

        const special_hand_size = special_cards.length / this.connected_players.length;
        console.log(`Calculated special hand size '${special_hand_size}' from card length '${special_cards.length}' and player count '${this.connected_players.length}'`)
        this.dealCards(special_cards, special_hand_size);

        const number_hand_size = number_cards.length / this.connected_players.length + special_hand_size;
        console.log(`Calculated hand size '${number_hand_size}' from card length '${number_cards.length}' and player count '${this.connected_players.length}'`)

        this.dealCards(number_cards, number_hand_size);

        this.current_turn = Math.floor(Math.random() * this.connected_players.length);

        this.sync();
    }

    dealCards(cards: Card[], limit: number) {
        const valid_players: string[] = [];
        this.connected_players.forEach((player) => {
            valid_players.push(player.id);
        })

        cards.forEach((card) => {
            const selected_player_index = Math.floor(Math.random() * valid_players.length);
            const selected_player_id = valid_players[selected_player_index];
            this.hands[selected_player_id].push(card);
            if (this.hands[selected_player_id].length === limit) {
                valid_players.splice(selected_player_index, 1);
            }
        });
    }
}