import { Socket } from "socket.io-client";
import { Antidote } from "../Rooms/Antidote";
import { Player } from "./Player";
import {
	GameSyncObject,
	CardObject,
	ActionSyncObject,
} from "../../../../common/sync-objects";
import {
	ActionType,
	HandQuery,
	TurnSelectObject,
} from "../../../../common/antidote-objects";

export class AntidotePlayer extends Player {
	room!: Antidote;
	hand: CardObject[] = [];
	workstation: CardObject[] = [];
	id: string = "";
	is_turn: boolean = false;
	waiting = false;

	constructor(socket: Socket, room: Antidote) {
		super(socket, room);
		socket.on("gameSync", (sync: GameSyncObject) => {
			this.gameSync(sync);
		});
		socket.on("actionSync", (sync: ActionSyncObject) => {
			this.actionSync(sync);
		});
	}

	async gotHandQuery() {
		return new Promise<HandQuery>((resolve) => {
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
		return new Promise<ActionSyncObject>((resolve) => {
			this.once("actionSync", (sync: ActionSyncObject) => resolve(sync));
		});
	}

	async gotPassQuery(direction: "left" | "right") {
		const query = await this.gotHandQuery();
		expect(query.can_reject).toBe(false);
		expect(query.message).toBe(`Pass a card to the ${direction}`);
		expect(query.destination).toBe(undefined);
	}

    async gotTradeQuery( source_id: string ){
        const query = await this.gotHandQuery();

        expect(query.can_reject).toBe(true);
        expect(query.message).toBe("Trade a card");
        expect(query.destination).toBe( source_id );
    }

    getSyringe() {
        const card = this.hand.find( (c) => {
            return c.suit === "syringe";
        });

		if (card === undefined) {
			throw "unable to find regular card.";
		}

        return card;
    }

	getRegularCard() {
		const card = this.hand.find((c) => {
			return c.suit !== "syringe" && c.value !== "x";
		});

		if (card === undefined) {
			throw "unable to find regular card.";
		}

		return card;
	}

	handResponse(card_id: string|undefined) {
		this.waiting = false;
		this.socket.emit("handResponse", card_id);
	}

	selectTurnAction(action: ActionType, argument?: string, argument2?: string, argument3?: string) {
		const object: TurnSelectObject = {
			action: action,
			argument: argument,
			argument2: argument2,
			argument3: argument3,
		};

		this.socket.emit("turnSelect", object);
	}
	selectDiscard() {
		this.selectTurnAction("discard");
	}
	selectPass(direction: "left" | "right") {
		this.selectTurnAction("pass", direction);
	}
    selectTrade(target: string){
        this.selectTurnAction("trade", target);
    }
    selectUseSyringe( type:"player"|"card", target_id: string ){
        this.selectTurnAction( "use", this.getSyringe().id, type, target_id);
    }

	actionSync(sync: ActionSyncObject) {
		if (sync.waiting_on.includes(this.id)) {
			this.waiting = true;
		}
		this.emit("actionSync", sync);
	}

	gameSync(sync: GameSyncObject) {
		this.hand = sync.hand;
		expect(sync.hand.length).toBeGreaterThan(0);
		this.id = sync.id;
		expect(sync.id).toBeDefined();
		this.workstation = sync.workstation;
		expect(sync.workstation.length).toBeGreaterThanOrEqual(0);
		this.is_turn = sync.is_turn;
		expect(sync.is_turn).toBeDefined();

		this.emit("gameSync");
	}
}
