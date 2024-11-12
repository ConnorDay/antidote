import { Room } from "../game/room";
import {
	Formula,
	ActionType,
	HandQuery,
} from "../../../common/antidote-objects";
import { Card } from "../game/card";
import {
	PlayerStatusObject,
	GameSyncObject,
	ActionSyncObject,
} from "../../../common/sync-objects";
import { GamePlayer } from "./GamePlayer";
import { Socket } from "socket.io";
import { Deck } from "../game/deck";

export class Antidote extends Room {
	connected_players: GamePlayer[] = [];
	turn_order: GamePlayer[] = [];

	antidote?: Formula;
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

		player.on(
			"actionSelected",
			(
				action: ActionType,
				argument?: string,
				argument2?: string,
				argument3?: string
			) => {
				this.handleActionSelect(action, argument, argument2, argument3);
			}
		);
	}

	async handleActionSelect(
		action: ActionType,
		argument?: string,
		argument2?: string,
		argument3?: string
	) {
		this.current_action = action;
		let update_turn = false;
		switch (action) {
			case "discard":
				update_turn = await this.handleDiscard();
				break;
			case "trade":
				update_turn = await this.handleTrade(argument);
				break;
			case "use":
				update_turn = await this.handleUse(
					argument,
					argument2,
					argument3
				);
				break;
			case "pass":
				update_turn = await this.handlePass(argument);
				break;
			default:
				console.error(
					`Unhandled action '${action}' passed to game room.`
				);
				return;
		}

		if (update_turn) {
			this.updateTurn(this.current_turn + 1);
		} else {
			this.updateTurn(this.current_turn);
		}
		this.sync();
	}

	async handleUse( card_id?: string, target_type?: string, target_id?: string) {
		if (card_id === undefined) {
			throw "Card id must be defined";
		}
		if (target_type === undefined) {
			throw "Target type must be defined";
		}
		if (target_id === undefined) {
			throw "Target id must be defined";
		}

		const current_player = this.turn_order[this.current_turn];
		const found_card = current_player.hand.find((c) => c.id === card_id);
		if (found_card === undefined) {
			throw `Unable to find card with id '${card_id}' for Player '${current_player.name}'`;
		}

		switch (found_card.suit) {
			case "syringe":
				if (target_type === "card") {
					return await this.handleUseSyringeCard(
						current_player,
						found_card,
						target_id
					);
				} else if (target_type === "player") {
					return await this.handleUseSyringePlayer(
						current_player,
						found_card,
						target_id
					);
				}
				break;
			default:
				throw `Suit '${found_card.suit}' is not implemented`;
		}

		return false;
	}

	async handleUseSyringePlayer(
		current_player: GamePlayer,
		card: Card,
		target_player_id: string
	) {
		const target_player = this.connected_players.find(
			(p) => p.id === target_player_id
		);
		if (target_player === undefined) {
			throw `Unable to find connected player with id '${target_player_id}'`;
		}

		console.log(
			`Player '${current_player.name}' used a syringe on Player '${target_player.name}'`
		);

		const hand_index = Math.floor(
			Math.random() * target_player.hand.length
		);
		const random_card = target_player.hand[hand_index];

		console.log(
			`Randomly selected Card '{suit:${random_card.suit}, value:${random_card.value}, id:${random_card.id}}'`
		);

		target_player.discard(random_card);
		target_player.hand.push(card);

		current_player.hand.push(random_card);
		current_player.discard(card);

		return true;
	}

	async handleUseSyringeCard( current_player: GamePlayer, card: Card, target_card_id: string ) {
		let target_player: GamePlayer | undefined = undefined;
		let target_card: Card | undefined = undefined;

		for (let player of this.turn_order) {
			const found_card = player.workstation.find(
				(c) => c.id === target_card_id
			);
			if (found_card !== undefined) {
				target_player = player;
				target_card = found_card;
                console.log(`Player ${target_player.name} has card id ${target_card_id}`);
				break;
			}
		}

		if (target_player === undefined || target_card === undefined) {
			throw `Unable to find a player with a workstation that has a card with id '${target_card_id}`;
		}

		const workstation_index = target_player.workstation.indexOf(target_card);
		if (workstation_index < 0) {
			throw `Somehow unable to get index of workstation card.`;
		}

		target_player.workstation[workstation_index] = card;
		current_player.hand.push(target_card);
        current_player.discard(card);

		return true;
	}

	async handleTrade(target_player_id?: string): Promise<boolean> {
		if (target_player_id === undefined) {
			throw "Player id must be defined";
		}
		const target_player = this.connected_players.find(
			(p) => p.id === target_player_id
		);

		if (target_player === undefined) {
			throw `Unable to find connected player with id '${target_player_id}'`;
		}

		const current_player = this.turn_order[this.current_turn];

		const target_query = target_player.queryHand(
			"Trade a card",
			true,
			this.getCurrentPlayerTurnId()
		);
		this.actionSync();
		const target_card = await target_query;
		if (target_card === undefined) {
			console.log(
				`Player '${target_player.name}' has rejected the trade request from Player '${current_player.name}' `
			);
			return false;
		}

		const source_query = current_player.queryHand(
			"Trade a card",
			true,
			target_player.id
		);
		this.actionSync();
		const source_card = await source_query;
		if (source_card === undefined) {
			console.log(
				`Player '${current_player.name}' has cancelled the trade request.`
			);
			return false;
		}

		target_player.discard(target_card);
		current_player.discard(source_card);

		target_player.hand.push(source_card);
		current_player.hand.push(target_card);

		return true;
	}

	async handlePass(direction?: string): Promise<boolean> {
		if (direction === undefined) {
			throw `Direction must be passed`;
		}

		let offset = 0;

		if (direction === "left") {
			offset = -1;
		} else if (direction === "right") {
			offset = 1;
		} else {
			throw `unknown direction ${direction}`;
		}

		const queries: Promise<Card | undefined>[] = [];
		const cards: { player: string; card: Card }[] = [];
		this.connected_players.forEach((player) => {
			const query = player.queryHand(
				`Pass a card to the ${direction}`,
				false
			);

			query.then((card) => {
				if (card === undefined) {
					throw `Invalid query response for Player '${player.name}'`;
				}

				player.discard(card);

				const player_index = this.turn_order.indexOf(player);
				const next_player_index =
					(this.turn_order.length + player_index + offset) %
					this.turn_order.length;
				const next_player = this.turn_order[next_player_index];

				cards.push({
					player: next_player.id,
					card: card,
				});

				this.actionSync();
			});

			queries.push(query);
		});

		this.actionSync();

		await Promise.all(queries);
		cards.forEach((dto) => {
			const target_player = this.turn_order.find(
				(p) => p.id == dto.player
			);
			target_player?.hand.push(dto.card);
		});
		return true;
	}

	async handleDiscard(): Promise<boolean> {
		const queries: Promise<Card | undefined>[] = [];
		this.connected_players.forEach((player) => {
			const query = player.queryHand("Discard a card", false);

			query.then((card) => {
				if (card === undefined) {
					throw `Invalid query response for Player '${player.name}'`;
				}

				player.discard(card);
				player.workstation.push(card);

				this.actionSync();
			});

			queries.push(query);
		});

		this.actionSync();

		await Promise.all(queries);
		return true;
	}

	sync() {
		if (this.connected_players.length === 0) {
			return;
		}

		this.connected_players.forEach((player) => {
			const status: PlayerStatusObject[] = [];
			this.turn_order.forEach((sub_player) => {
				if (sub_player.id === player.id) {
					return;
				}

				const is_turn = this.getCurrentPlayerTurnId() === sub_player.id;
				status.push({
					name: sub_player.name,
					id: sub_player.id,
					workstation: sub_player.getHiddenWorkstation(),
					is_turn: is_turn,
				});
			});

			const is_turn = this.getCurrentPlayerTurnId() === player.id;
			const sync: GameSyncObject = {
				players: status,
				hand: player.hand,
				workstation: player.workstation,
				id: player.id,
				is_turn: is_turn,
			};
			player.socket.emit("gameSync", sync);
		});
	}

	actionSync() {
		const sync: ActionSyncObject = {
			waiting_on: this.getWaitingPlayers(),
		};
		this.emitAll("actionSync", sync);
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
		console.log(`Selected ${this.antidote} as the antidote`);
		x_cards.splice(random_index, 1);

		const special_cards = new Deck<Card>();
		const number_cards = new Deck<Card>();
		x_cards.forEach((formula) => {
			special_cards.add(new Card(formula, "x"));
			for (let i = 0; i < this.connected_players.length; i++) {
				number_cards.add(new Card(formula, `${i + 1}`));
			}
		});

		for (let i = 0; i < this.connected_players.length; i++) {
			number_cards.add(new Card(this.antidote, `${i + 1}`));
		}

		const number_of_syringes =
			this.connected_players.length -
			(x_cards.length % this.connected_players.length);
		console.log(`Calculated number of syringes: ${number_of_syringes}`);

		for (let i = 0; i < number_of_syringes; i++) {
			special_cards.add(new Card("syringe"));
		}

		const special_hand_size =
			special_cards.length / this.connected_players.length;
		special_cards.shuffle();
		this.dealCards(special_cards, special_hand_size);

		number_cards.shuffle();
		this.dealCards(number_cards, x_cards.length + 1);

		this.connected_players.forEach((player) => {
			this.turn_order.push(player);
		});

		this.updateTurn(
			Math.floor(Math.random() * this.connected_players.length)
		);
	}

	updateTurn(turn_number: number) {
		while (turn_number < 0) {
			turn_number = this.connected_players.length + turn_number;
		}

		turn_number %= this.connected_players.length;
		this.current_turn = turn_number;

		console.log("Current turn number:", turn_number);
		const current_player = this.connected_players[turn_number];
		current_player.waiting = true;
		this.current_action = undefined;

		this.sync();
	}

	dealCards(cards: Deck<Card>, limit: number) {
		this.connected_players.forEach((player) => {
			cards.draw(limit).forEach((card) => {
				player.hand.push(card);
			});
		});
	}

	getCurrentPlayerTurnId() {
		return this.turn_order[this.current_turn].id;
	}

	getWaitingPlayers() {
		const waiting: string[] = [];

		this.connected_players.forEach((player) => {
			if (player.waiting) {
				waiting.push(player.id);
			}
		});

		return waiting;
	}
}
