import { Socket } from "socket.io-client";
import { AntidotePlayer } from "../Players/AntidotePlayer";
import { Room } from "./Room";
import { ActionSyncObject } from "../../../../common/sync-objects";
import { HandQuery } from "../../../../common/antidote-objects";

export class Antidote extends Room<AntidotePlayer> {
	createPlayer(socket: Socket): AntidotePlayer {
		return new AntidotePlayer(socket, this);
	}

	async sync() {
		await super.sync("gameSync");
	}

	async allGotDiscard() {
		const promises: Promise<void>[] = [];

		this.players.forEach((player) => {
			promises.push(player.gotDiscardQuery());
		});

		await Promise.all(promises);
	}

	async allGotActionSync() {
		const promises: Promise<ActionSyncObject>[] = [];

		this.players.forEach((player) => {
			promises.push(player.gotActionSync());
		});

		await Promise.all(promises);
	}

	async allGotPass(direction: "left" | "right") {
		const promises: Promise<void>[] = [];

		this.players.forEach((player) => {
			promises.push(player.gotPassQuery(direction));
		});

		await Promise.all(promises);
	}

    async onlyTargetGotTrade( source_id:string, target_id: string ){
        const promises: Promise<void>[] = [];

        this.players.forEach( (player) => {
            if (player.id === target_id) {
                promises.push( player.gotTradeQuery(source_id) );
            } else {
                promises.push( player.doesNotGetEvent("handQuery") );
            }
        });

        await Promise.all( promises );
    }

	async allSendRegularResponse() {
		const sync = this.sync();
		const card_ids: string[] = [];
		for (let i = 0; i < this.players.length; i++) {
			const action_sync = this.allGotActionSync();
			const selected_card = this.players[i].getRegularCard().id;
			this.players[i].handResponse(selected_card);
			card_ids.push(selected_card);
			await action_sync;

			for (let j = 0; j < this.players.length; j++) {
				expect(this.players[j].waiting).toBe(j > i);
			}
		}

		await sync;

		return card_ids;
	}

	get current_player(): AntidotePlayer {
		const current = this.players.find((p) => p.is_turn);
		if (current === undefined) {
			throw "No current player";
		}

		return current;
	}
}
