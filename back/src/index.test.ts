import { beforeAll, describe, expect, test } from "@jest/globals";
import { io, Socket } from "socket.io-client";
import { ActionSyncObject, CardObject, GameSyncObject, LoadingSyncObject, LobbySyncObject, } from "../../common/sync-objects";
import { HandQuery, TurnSelectObject } from "../../common/antidote-objects";
import { Lobby } from "./test/Rooms/Lobby";
import { Loading } from "./test/Rooms/Loading";
import { Antidote } from "./test/Rooms/Antidote";

const lobby = new Lobby();

describe("Lobby Testing", () => {
	test("Player 1 connects to server", async () => {
		lobby.addPlayer(lobby.createPlayer());
		await lobby.sync();
	});

	test("Player 2 connects to server", async () => {
		lobby.addPlayer(lobby.createPlayer());
		await lobby.sync();
	});

	test("Duplicate Players can't connect", async () => {
		const fake_player = io("ws://localhost:8000", {
			query: {
				name: "player2",
				code: "1234",
			},
		});
		const error: any = await new Promise((resolve) => {
			fake_player.once("error", (error) => resolve(error));
		});
		expect(error.message).toBeDefined();
		expect(fake_player.disconnected).toBeTruthy();
		fake_player.close();
	});

	test("Player leaves", async () => {
		const leaver = lobby.players.pop();
		leaver!.socket.close();
		expect(lobby.players.length).toBe(1);
		await lobby.sync();
	});

	test("Add 4 more players", async () => {
		for (let i = 0; i < 4; i++) {
			lobby.addPlayer(lobby.createPlayer());
			await lobby.sync();
		}
	});

	test("Able to ready", async () => {
		lobby.players[0].toggleReady();
		expect(lobby.players[0].ready).toBe(true);
		await lobby.sync();
	});

	test("Host unable to start timer", async () => {
		const error_timer = lobby.players[0].getError().then(({ message }) => {
			expect(message).toBe("not all players are ready");
		});
		lobby.players[0].toggleTimer();
		await Promise.all([lobby.noneGetEvent("roundTimerStart"), error_timer]);
	});

	test("Non-host unable to start timer", async () => {
		const error_timer = lobby.players[1].getError().then(({ message }) => {
			expect(message).toBe(
				"only the host is able to toggle the round timer"
			);
		});
		lobby.players[1].toggleTimer();
		await Promise.all([lobby.noneGetEvent("roundTimerStart"), error_timer]);
	});

	test("All players ready", async () => {
		for (let i = 1; i < lobby.players.length; i++) {
			lobby.players[i].toggleReady();
			expect(lobby.players[i].ready).toBe(true);
			await lobby.sync();
		}
	});

	test("Non-host unable to start timer", async () => {
		const error_timer = lobby.players[1].getError().then(({ message }) => {
			expect(message).toBe(
				"only the host is able to toggle the round timer"
			);
		});
		lobby.players[1].toggleTimer();
		await Promise.all([lobby.noneGetEvent("roundTimerStart"), error_timer]);
	});

	test("Host able to start timer", async () => {
		lobby.players[0].toggleTimer();
		await lobby.roundTimerStarted();
	});

	test("Host cancels timer", async () => {
		lobby.players[0].toggleTimer();
		await lobby.roundTimerStopped();
	});

	test("Host able to start timer", async () => {
		lobby.players[0].toggleTimer();
		await lobby.roundTimerStarted();
	});

	test("Player leaves after timer", async () => {
		const leaver = lobby.players.pop();
		leaver!.socket.close();
		await Promise.all([lobby.sync(), lobby.roundTimerStopped()]);
	});

	test("Host able to start timer", async () => {
		lobby.players[0].toggleTimer();
		await lobby.roundTimerStarted();
	});

	test("Player joins after timer", async () => {
		lobby.addPlayer(lobby.createPlayer());
		await Promise.all([lobby.sync(), lobby.roundTimerStopped()]);
	});

	test("Last player readies", async () => {
		lobby.players[4].toggleReady();
		await lobby.sync();
	});

	let time_to_start = 0;
	test("Host able to start timer", async () => {
		lobby.players[0].toggleTimer();
		time_to_start = await lobby.roundTimerStarted();
	});

	test("Timer resolves", async () => {
		await lobby.newRoom(time_to_start);
	}, 8000);
});

const game = new Antidote();
const loading = new Loading();
let initial_sync: Promise<void>;
describe("Loading Testing", () => {
	test("Loading created successfully", () => {
		loading.copyFrom(lobby);
		game.copyFrom(loading);
		expect(loading.players.length).toBe(lobby.players.length);
	});

	test("One player loaded", async () => {
		loading.players[0].setLoaded();
		await loading.sync();
	});

	test("Player can't load in multiple times", async () => {
		const error = loading.players[0].gotError();
		error.then(({ message }) => {
			expect(message).toBe("Already connected into room.");
		});
		const none_sync = loading.noneGetEvent("loadingSync");
		loading.players[0].setLoaded();

		await error;

		await Promise.all([error, none_sync]);
	});

	test("Rest of players load in", async () => {
		initial_sync = game.sync();

		for (let i = 1; i < loading.players.length; i++) {
			const sync = loading.sync();
			loading.players[i].setLoaded();
			await sync;
		}
	});
});

let antidote_value: string;
describe("Game Testing", () => {
    describe("Initialization", () => {
        test("Game created successfully", () => {
            expect(game.players.length).toBe(loading.players.length);
        });

        test("Got first sync", async () => {
            expect(initial_sync).toBeDefined();
            await initial_sync;
        });

        test("Hands are the same size", () => {
            const size = game.players[0].hand.length;
            game.players.forEach((player) => {
                expect(player.hand.length).toBe(size);
            });
        });

        test("Workstations are empty", () => {
            game.players.forEach((player) => {
                expect(player.workstation.length).toBe(0);
            });
        });

        test("Able to determine antidote", () => {
            const suits = new Set<string>();
            const x_cards: string[] = [];

            game.players.forEach((player) => {
                player.hand.forEach((card) => {
                    expect(card.suit).toBeDefined();
                    if (card.suit === undefined) return; //for better type hints

                    if (card.suit !== "syringe") {
                        suits.add(card.suit);
                    }
                    if (card.value === "x") {
                        x_cards.push(card.suit);
                    }
                });
            });

            x_cards.forEach((formula) => {
                expect(suits.has(formula)).toBe(true);
                if (!suits.has(formula)) return;

                suits.delete(formula);
            });

            expect(suits.size).toBe(1);
            antidote_value = suits.values().next().value;

            expect(antidote_value).toBeDefined();
        });
    });

    describe("Discard Testing", () => {
        test("Send discard request", async () => {
            const discard = game.allGotDiscard();
            const action = game.allGotActionSync();
            game.current_player.selectDiscard();
            await Promise.all([discard, action]);

            game.players.forEach((player) => {
                expect(player.waiting).toBe(true);
            });
        });
        test("Everyone discards", async () => {
            await game.allSendRegularResponse();
        });

        test("Workstation has a card", () => {
            game.players.forEach((player) => {
                expect(player.workstation.length).toBe(1);
            });
        });
    })

    describe("Pass Testing", () => {
        describe("Pass to the left", () => {
            test("Send pass request to the left", async () => {
                const pass = game.allGotPass("left");
                game.current_player.selectPass("left");

                const action = game.allGotActionSync();
                game.current_player.selectDiscard();
                await Promise.all([pass, action]);

                game.players.forEach((player) => {
                    expect(player.waiting).toBe(true);
                });
            });

            test("Resolve pass request", async () => {
                const card_ids = await game.allSendRegularResponse();
                card_ids.forEach((card_id, index) => {
                    const next_index = (game.players.length - 1 + index) % game.players.length;
                    expect( game.players[next_index].hand.find(c => c.id === card_id) ).toBeDefined()
                });
            });
        });

        describe("Pass to the right", () => {
            test("Send pass request to the right", async () => {
                const pass = game.allGotPass("right");
                game.current_player.selectPass("right");

                const action = game.allGotActionSync();
                game.current_player.selectDiscard();
                await Promise.all([pass, action]);

                game.players.forEach((player) => {
                    expect(player.waiting).toBe(true);
                });
            });

            test("Resolve pass request", async () => {
                const card_ids = await game.allSendRegularResponse();
                card_ids.forEach((card_id, index) => {
                    const next_index = (game.players.length + 1 + index) % game.players.length;
                    expect( game.players[next_index].hand.find(c => c.id === card_id) ).toBeDefined()
                });
            });
        });

        describe("Trade", () => {
            describe("Target Player Cancels Request", () => {
                let target_index: number;
                let target_player_id: string;
                test("Send request", async () => {
                    target_index = (game.players.indexOf(game.current_player) + 1) % game.players.length;
                    target_player_id = game.players[target_index].id;

                    const trade = game.onlyTargetGotTrade( game.current_player.id, target_player_id );
                    
                    const action = game.allGotActionSync()

                    game.current_player.selectTrade( target_player_id );

                    await Promise.all( [trade, action] );
                });

                test("Only target is waiting", () => {
                    game.players.forEach( (player) => {
                        expect( player.waiting ).toBe( player.id === target_player_id );
                    });
                });

                test("Send Cancel Response", async () => {
                    const current_player_id = game.current_player.id;

                    const sync = game.sync();
                    game.players[target_index].handResponse( undefined )

                    await sync;

                    expect( game.current_player.id ).toBe( current_player_id );
                    expect( game.players[target_index].waiting ).toBe( false );

                });
            });

            describe("Current Player Cancels Request", () => {
                let target_index: number;
                let target_player_id: string;

                let target_card_id: string;

                test("Send Request", async () => {
                    target_index = (game.players.indexOf(game.current_player) + 1) % game.players.length;
                    target_player_id = game.players[target_index].id;

                    const trade = game.onlyTargetGotTrade( game.current_player.id, target_player_id );
                    
                    const action = game.allGotActionSync()

                    game.current_player.selectTrade( target_player_id );

                    await Promise.all( [trade, action] );
                });

                test("Only Target is Waiting", () => {
                    game.players.forEach( (player) => {
                        expect( player.waiting ).toBe( player.id === target_player_id );
                    });
                });

                test("Send Target Player Response", async () => {
                    const current_player_id = game.current_player.id;
                    const action = game.allGotActionSync();

                    target_card_id = game.players[target_index].getRegularCard().id;
                    game.players[target_index].handResponse( target_card_id )

                    await action;


                    expect(game.current_player.id).toBe(current_player_id);

                    game.players.forEach( (player) => {
                        expect( player.waiting ).toBe( player.id === current_player_id );
                    });
                });

                test("Send Current Player Cancel", async () => {
                    const current_player_id = game.current_player.id;

                    const sync = game.sync();
                    game.current_player.handResponse( undefined )

                    await sync;

                    expect( game.current_player.id ).toBe( current_player_id );
                    game.players.forEach( (player) => {
                        expect( player.waiting ).toBe(false);
                    });

                });

                test("Card did not get traded", () => {
                    expect( game.players[target_index].hand.find( c => c.id === target_card_id) ).toBeDefined();
                    expect( game.current_player.hand.find(c => c.id === target_card_id) ).toBeUndefined();
                });
            });

            describe("Successful Trade", () => {
                let target_index: number;
                let target_player_id: string;

                let target_card_id: string;
                let source_card_id: string;

                let source_player_id: string;

                test("Send Request", async () => {
                    target_index = (game.players.indexOf(game.current_player) + 1) % game.players.length;
                    target_player_id = game.players[target_index].id;

                    const trade = game.onlyTargetGotTrade( game.current_player.id, target_player_id );
                    
                    const action = game.allGotActionSync()

                    game.current_player.selectTrade( target_player_id );

                    await Promise.all( [trade, action] );
                });

                test("Only Target is Waiting", () => {
                    game.players.forEach( (player) => {
                        expect( player.waiting ).toBe( player.id === target_player_id );
                    });
                });

                test("Send Target Player Response", async () => {
                    const current_player_id = game.current_player.id;
                    const action = game.allGotActionSync();

                    target_card_id = game.players[target_index].getRegularCard().id;
                    game.players[target_index].handResponse( target_card_id )

                    await action;


                    expect(game.current_player.id).toBe(current_player_id);

                    game.players.forEach( (player) => {
                        expect( player.waiting ).toBe( player.id === current_player_id );
                    });
                });

                test("Send Current Player Response", async () => {
                    source_player_id = game.current_player.id;

                    const sync = game.sync();
                    
                    source_card_id = game.current_player.getRegularCard().id;
                    game.current_player.handResponse( source_card_id )

                    await sync;

                    game.players.forEach( (player) => {
                        expect( player.waiting ).toBe(false);
                    });

                });

                test("Cards got traded", () => {
                    const source_player = game.players.find( p => p.id === source_player_id);
                    if ( source_player === undefined ){
                        throw "Could not find source player";
                    }
                    expect( game.players[target_index].hand.find( c => c.id === target_card_id) ).toBeUndefined();
                    expect( source_player.hand.find(c => c.id === target_card_id) ).toBeDefined();

                    expect( game.players[target_index].hand.find( c => c.id === source_card_id) ).toBeDefined();
                    expect( source_player.hand.find(c => c.id === source_card_id) ).toBeUndefined();
                });
            });
        });
    });

    describe("Syringe Testing", () => {
        describe("Syringe Player", () => {
            let source_player_id: string;
            let source_player_index: number;
            let source_player_hand: CardObject[] = [];

            let target_player_id: string;
            let target_player_index: number
            let target_player_hand: CardObject[] = [];

            test("Get to player who has a syringe", async () => {
                while ( game.current_player.hand.find( c => c.suit=="syringe") === undefined ) {
                    const pass = game.allGotPass("right");
                    game.current_player.selectPass("right");

                    const action = game.allGotActionSync();
                    game.current_player.selectDiscard();
                    await Promise.all([pass, action]);

                    game.players.forEach((player) => {
                        expect(player.waiting).toBe(true);
                    });
                    const card_ids = await game.allSendRegularResponse();
                    card_ids.forEach((card_id, index) => {
                        const next_index = (game.players.length + 1 + index) % game.players.length;
                        expect( game.players[next_index].hand.find(c => c.id === card_id) ).toBeDefined()
                    });
                }
            });

            test("Send Syringe Request", async () => {
                source_player_id = game.current_player.id;
                source_player_index = game.players.indexOf( game.current_player );
                game.current_player.hand.forEach( c => source_player_hand.push(c) );

                target_player_index = ( source_player_index + 1 ) % game.players.length;
                target_player_id = game.players[target_player_index].id
                game.players[target_player_index].hand.forEach( c => target_player_hand.push(c) );

                const sync = game.sync();
                game.current_player.selectUseSyringe("player", target_player_id)
                await sync;
            });

            describe("Target player has a new syringe that is missing from the source player", () => {
                let target_player_card: CardObject;
                test("Target player has a new syringe", () => {
                    const target_player = game.players[target_player_index];

                    const new_card = target_player.hand.find( new_hand_card => {
                        const found_card = target_player_hand.find( old_hand_card => {
                            return new_hand_card.id === old_hand_card.id;
                        });

                        return found_card === undefined;
                    });

                    expect(new_card).toBeDefined();
                    if (new_card === undefined) {
                        throw "could not find new card";
                    }

                    expect(new_card.suit).toBe("syringe");

                    target_player_card = new_card;
                });
                test("Source player is missing a syringe", () => {
                    let before_count = 0;
                    source_player_hand.forEach( c => {
                        if ( c.suit == "syringe" ){
                            before_count++;
                        }
                    });

                    let after_count = 0;
                    game.players[source_player_index].hand.forEach( c=> {
                        if ( c.suit == "syringe" ){
                            after_count++;
                        }
                    });

                    expect(after_count).toBe( before_count - 1 );
                });
                test("Syringe Id is not in source player's hand", () => {
                    const found_card = game.players[source_player_index].hand.find( c => {
                        return c.id === target_player_card.id;
                    });

                    expect(found_card).toBeUndefined();
                });
            });
            describe("Target player lost a card that was gained by the source player", () => {
                let source_player_card: CardObject;
                test("Source player has a new card", () => {
                    const source_player = game.players[source_player_index];

                    const new_card = source_player.hand.find( new_hand_card => {
                        const found_card = source_player_hand.find( old_hand_card => {
                            return new_hand_card.id === old_hand_card.id;
                        });

                        return found_card === undefined;
                    });

                    expect(new_card).toBeDefined();
                    if (new_card === undefined) {
                        throw "could not find new card";
                    }

                    source_player_card = new_card;
                });
                test("Card Id is not in target player's hand", () => {
                    const found_card = game.players[target_player_index].hand.find( c => {
                        return c.id === source_player_card.id;
                    });

                    expect(found_card).toBeUndefined();
                });
            });
        });

        describe("Syringe Card", () => {
            test("Get to player who has a syringe", async () => {
                while ( game.current_player.hand.find( c => c.suit=="syringe") === undefined ) {
                    const pass = game.allGotPass("right");
                    game.current_player.selectPass("right");

                    const action = game.allGotActionSync();
                    game.current_player.selectDiscard();
                    await Promise.all([pass, action]);

                    game.players.forEach((player) => {
                        expect(player.waiting).toBe(true);
                    });
                    const card_ids = await game.allSendRegularResponse();
                    card_ids.forEach((card_id, index) => {
                        const next_index = (game.players.length + 1 + index) % game.players.length;
                        expect( game.players[next_index].hand.find(c => c.id === card_id) ).toBeDefined()
                    });
                }
            })
        });
    });

});

afterAll(() => {
	game.players.forEach((player) => {
		player.socket.close();
	});
});

/*
describe("Lobby Testing", () => {
    test("Syringe player", async () => {
        const syringe_id = await stallUntilSyringeHand();

        console.log(turn);

        const current_player = players[turn];
        const target_player_hand = turn === 0 ? hands[1] : hands[0];

        const sync = await new Promise<GameSyncObject>((resolve) => {
            players.forEach((player, index) => {
                player.once("gameSync", (sync: GameSyncObject) => {
                    if (index === turn){
                        resolve(sync);
                    }
                })
            })

            current_player.emit("resync");
        });

        const current_player_id = sync.id;
        const target_player_id = sync.players[0].id;

        const sync_timer = expectAllPredicate(async (player) => {
            return new Promise<void>((resolve) => {
                player.once("gameSync", (sync: GameSyncObject) => {
                    const player_index = players.findIndex( p => p.id === player.id );
                    hands[player_index] = sync.hand;
                    workstations[player_index] = sync.workstation;

                    if (sync.id === current_player_id){
                        const new_card = sync.hand[sync.hand.length - 1];
                        const found_card = target_player_hand.find(c => c.id === new_card.id);
                        expect(found_card).toBeDefined();
                    } else if (sync.id === target_player_id){
                        const found_card = sync.hand.find( c => c.id === syringe_id);
                        console.log(sync.hand);
                        expect(found_card).toBeDefined();
                    }

                    if (sync.is_turn){
                        expect(player_index).toBe( (turn + 1) % players.length );
                        turn = player_index;
                    }
                    resolve();
                });
            })
        });

        const select: TurnSelectObject = {
            action: "use",
            argument: syringe_id,
            argument2: "player",
            argument3: target_player_id,
        }

        current_player.emit("turnSelect", select);
        await sync_timer;

    });

    test("Syringe card", async () => {
        const syringe_id = await stallUntilSyringeHand();

        const current_player = players[turn];

        console.log(turn)

        const sync = await new Promise<GameSyncObject>((resolve) => {
            players.forEach((player, index) => {
                player.once("gameSync", (sync: GameSyncObject) => {
                    if (index === turn){
                        resolve(sync);
                    }
                })
            })

            current_player.emit("resync");
        });

        const current_player_id = sync.id;
        const target_player_id = sync.players[0].id;
        const target_card_id = sync.players[0].workstation[0].id;

        const sync_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("gameSync", (sync: GameSyncObject) => {
                    const player_index = players.findIndex( p => p.id === player.id );
                    hands[player_index] = sync.hand;
                    workstations[player_index] = sync.workstation;

                    if (sync.id === current_player_id){
                        const found_card = sync.hand.find( c => c.id === target_card_id );
                        expect(found_card).toBeDefined();
                    } else if (sync.id === target_player_id){
                        const found_card = sync.workstation.find( c => c.id === syringe_id);
                        expect(found_card).toBeDefined();
                    }

                    if (sync.is_turn){
                        expect(player_index).toBe( (turn + 1) % players.length );
                        turn = player_index;
                    }
                    resolve();
                });
            });
        });

        const select: TurnSelectObject = {
            action: "use",
            argument: syringe_id,
            argument2: "card",
            argument3: target_card_id,
        }

        current_player.emit("turnSelect", select);
        await sync_timer;
    });

});
*/
