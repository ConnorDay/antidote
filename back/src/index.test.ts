import { beforeAll, describe, expect, test } from "@jest/globals";
import { io, Socket } from "socket.io-client";
import { ActionSyncObject, CardObject, GameSyncObject, LoadingSyncObject, LobbySyncObject } from "../../common/sync-objects";
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
        const fake_player = io(
            "ws://localhost:8000",
            {
                query: {
                    name: "player2",
                    code: "1234"
                }
            }
        )
        const error: any = await new Promise((resolve) => {
            fake_player.once("error", (error) => resolve(error))
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
        const error_timer = lobby.players[0].getError().then(({message}) => {
            expect(message).toBe("not all players are ready");
        });
        lobby.players[0].toggleTimer();
        await Promise.all( [lobby.noneGetEvent("roundTimerStart"), error_timer] );
    });

    test("Non-host unable to start timer", async () => {
        const error_timer = lobby.players[1].getError().then(({message}) => {
            expect(message).toBe("only the host is able to toggle the round timer");
        });
        lobby.players[1].toggleTimer();
        await Promise.all( [lobby.noneGetEvent("roundTimerStart"), error_timer] );
    });

    test("All players ready", async () => {
        for (let i = 1; i < lobby.players.length; i++) {
            lobby.players[i].toggleReady();
            expect(lobby.players[i].ready).toBe(true);
            await lobby.sync();
        }
    });

    test("Non-host unable to start timer", async () => {
        const error_timer = lobby.players[1].getError().then(({message}) => {
            expect(message).toBe("only the host is able to toggle the round timer");
        });
        lobby.players[1].toggleTimer();
        await Promise.all( [lobby.noneGetEvent("roundTimerStart"), error_timer] );
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
        await Promise.all( [lobby.sync(), lobby.roundTimerStopped()]);
    });

    test("Host able to start timer", async () => {
        lobby.players[0].toggleTimer();
        await lobby.roundTimerStarted();
    });
    
    test("Player joins after timer", async () => {
        lobby.addPlayer(lobby.createPlayer());
        await Promise.all( [lobby.sync(), lobby.roundTimerStopped()]);
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
describe ("Loading Testing", () => {
    test("Loading created successfully", () => {
        loading.copyFrom(lobby);
        game.copyFrom(loading);
        expect( loading.players.length ).toBe(lobby.players.length);
    });

    test("One player loaded", async () => {
        loading.players[0].setLoaded();
        await loading.sync();
    });

    test("Player can't load in multiple times", async () => {
        const error = loading.players[0].gotError();
        error.then( ({message}) => {
            expect(message).toBe("Already connected into room.");
        });
        const none_sync = loading.noneGetEvent("loadingSync");
        loading.players[0].setLoaded();

        await error;

        await Promise.all([error, none_sync]);
    });

    test("Rest of players load in", async () => {
    
        initial_sync = game.sync();
    
        for (let i = 1; i < loading.players.length; i++){
            const sync = loading.sync()
            loading.players[i].setLoaded();
            await sync;
        }
    });

});

let antidote_value: string;
describe("Game Testing", () => {
    test("Game created successfully", () => {
        expect( game.players.length ).toBe(loading.players.length);
    });

    test("Got first sync", async () => {
        expect(initial_sync).toBeDefined()
        await initial_sync
    });

    test("Hands are the same size", () => {
        const size = game.players[0].hand.length;
        game.players.forEach(player => {
            expect(player.hand.length).toBe(size);
        });
    })

    test("Workstations are empty", () => {
        game.players.forEach(player => {
            expect(player.workstation.length).toBe(0);
        });
    })

    test("Able to determine antidote", () => {
        const suits = new Set<string>();
        const x_cards: string[] = [];
        
        game.players.forEach( player => {
            player.hand.forEach( card => {
                expect(card.suit).toBeDefined();
                if (card.suit === undefined) return; //for better type hints

                if (card.suit !== "syringe"){
                    suits.add(card.suit);
                }
                if (card.value === "x"){
                    x_cards.push(card.suit);
                }
            });
        });

        x_cards.forEach( formula => {
            expect( suits.has(formula) ).toBe(true);
            if(!suits.has(formula)) return;

            suits.delete(formula);
        });

        expect(suits.size).toBe(1);
        antidote_value = suits.values().next().value;

        expect(antidote_value).toBeDefined();
    });

    test("Send discard request", async () => {
        const discard = game.allGotDiscard();
        const action = game.allGotActionSync();
        game.current_player.selectDiscard();
        await Promise.all([ discard, action ]);

        game.players.forEach( player => {
            expect( player.waiting ).toBe(true);
        })
    });
    test("Everyone discards", async () => {
        const sync = game.sync();
        for (let i = 0; i < game.players.length; i++){
            const action_sync = game.allGotActionSync();
            game.players[i].handResponse(game.players[i].getRegularCard().id);
            await action_sync;

            for (let j = 0; j < game.players.length; j++){
                expect( game.players[j].waiting ).toBe(j > i);
            }
        }

        await sync;
    });

    test("Workstation has a card", () => {
        game.players.forEach( player => {
            expect(player.workstation.length).toBe(1);
        });
    });
});

/*
describe("Lobby Testing", () => {
    async function send_pass_request(direction: "left"|"right"){
        const sync_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("handQuery", (query: HandQuery) => {
                    expect(query.can_reject).toBe(false);
                    expect(query.message).toBe("Pass a card");
                    expect(query.destination).toBe(undefined);

                    resolve();
                });
            })
        });

        const action_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("actionSync", (sync: ActionSyncObject) => {
                    expect(sync.waiting_on.length).toBe(players.length);

                    resolve();
                });
            });
        });

        const select: TurnSelectObject = {
            action: "pass",
            argument: direction
        }
        players[turn].emit("turnSelect", select);
        await Promise.all([sync_timer, action_timer]);
    }

    async function send_pass_hand_responses(direction: "left"|"right"){
        const to_expect: string[] = Array(players.length);

        const sync_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("gameSync", (sync: GameSyncObject) => {
                    const player_index = players.findIndex( p => p.id === player.id );
                    hands[player_index] = sync.hand;
                    workstations[player_index] = sync.workstation;

                    const expected_card = to_expect[player_index];
                    const found_card = sync.hand.find( c => c.id === expected_card );
                    expect( found_card ).toBeDefined();

                    if (sync.is_turn){
                        expect(player_index).toBe( (turn + 1) % players.length );
                        turn = player_index;
                    }
                    resolve();
                });
            })
        });

        for (let i = 0; i < players.length; i++){
            const action_timer = expectAllPredicate(async (player) => {
                return new Promise((resolve) => {
                    player.once("actionSync", (sync: ActionSyncObject) => {
                        expect(sync.waiting_on.length).toBe(players.length - 1 - i);

                        resolve();
                    });
                });
            });

            players[i].emit("handResponse", hands[i][0].id);
            const offset = direction === "left" ? -1 : 1;
            to_expect[ (i + to_expect.length + offset) % to_expect.length ] = hands[i][0].id;

            await action_timer;
        }

        await sync_timer;

    }

    test("pass to the left", async () => {
        await send_pass_request("left");
        await send_pass_hand_responses("left");
    });

    test("pass to the right", async () => {
        await send_pass_request("right");
        await send_pass_hand_responses("right");
    })

    async function send_trade_request(){
        const current_player = players[turn]
        const target_player_socket = turn === 0 ? players[1] : players[0];

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

        const target_player_id: string = sync.players[0].id;

        const action_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("actionSync", (sync: ActionSyncObject) => {
                    expect(sync.waiting_on.length).toBe(1);

                    resolve();
                });
            });
        });

        const sync_timer = new Promise<void>((resolve) => {
            target_player_socket.once("handQuery", (query: HandQuery) => {
                expect(query.can_reject).toBe(true);
                expect(query.message).toBe("Trade a card");
                expect(query.destination).toBe(sync.id);

                resolve();
            });
        });

        const select: TurnSelectObject = {
            action: "trade",
            argument: target_player_id,
        }
        players[turn].emit("turnSelect", select);
        await Promise.all([sync_timer, action_timer]);

        return [sync.id, target_player_id];
    }

    function query_response(player_index: number, card_index?:number){
        let target: string | undefined = undefined;
        if (card_index !== undefined){
            target = hands[player_index][card_index].id;
        }

        players[player_index].emit("handResponse", target);
        return target;
    }

    test("Trade target rejects", async () => {
        await send_trade_request();
        const sync_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("gameSync", (sync: GameSyncObject) => {
                    const player_index = players.findIndex( p => p.id === player.id );
                    hands[player_index] = sync.hand;
                    workstations[player_index] = sync.workstation;

                    if (sync.is_turn){
                        expect(player_index).toBe(turn);
                    }
                    resolve();
                });
            })
        });

        query_response( turn === 0 ? 1 : 0, undefined );

        await sync_timer;
    });

    test("Trade current player cancelled", async () => {
        const [current_player_id, target_player_id] = await send_trade_request();

        const action_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("actionSync", (sync: ActionSyncObject) => {
                    expect(sync.waiting_on.length).toBe(1);

                    resolve();
                });
            });
        });

        const hand_timer = new Promise<void>((resolve) => {
            players[turn].once("handQuery", (query: HandQuery) => {
                expect(query.can_reject).toBe(true);
                expect(query.message).toBe("Trade a card");
                expect(query.destination).toBe(target_player_id);

                resolve();
            });
        });

        query_response( turn === 0 ? 1 : 0, 0 );
        await Promise.all([action_timer, hand_timer]);
        
        const sync_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("gameSync", (sync: GameSyncObject) => {
                    const player_index = players.findIndex( p => p.id === player.id );
                    hands[player_index] = sync.hand;
                    workstations[player_index] = sync.workstation;

                    if (sync.is_turn){
                        expect(player_index).toBe(turn);
                    }
                    resolve();
                });
            })
        });

        query_response( turn, undefined );
        await sync_timer;
    });

    test("Trade successfully", async () => {
        const [current_player_id, target_player_id] = await send_trade_request();

        const action_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("actionSync", (sync: ActionSyncObject) => {
                    expect(sync.waiting_on.length).toBe(1);

                    resolve();
                });
            });
        });

        const hand_timer = new Promise<void>((resolve) => {
            players[turn].once("handQuery", (query: HandQuery) => {
                expect(query.can_reject).toBe(true);
                expect(query.message).toBe("Trade a card");
                expect(query.destination).toBe(target_player_id);

                resolve();
            });
        });

        const target_card = query_response( turn === 0 ? 1 : 0, 0 );
        expect(target_card).toBeDefined();
        await Promise.all([action_timer, hand_timer]);

        let source_card: string|undefined;

        const sync_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("gameSync", (sync: GameSyncObject) => {
                    const player_index = players.findIndex( p => p.id === player.id );
                    hands[player_index] = sync.hand;
                    workstations[player_index] = sync.workstation;

                    if (sync.id === current_player_id){
                        const found_card = sync.hand.find( c => c.id === target_card);
                        expect(found_card).toBeDefined();
                    } else if (sync.id === target_player_id){
                        const found_card = sync.hand.find( c => c.id === source_card);
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


        source_card = query_response( turn, 0 );
        expect(source_card).toBeDefined();

        await sync_timer;
    });

    async function currentTurnHasSyringe(): Promise<boolean>{
        const current_player = players[turn];

        const sync = await new Promise<GameSyncObject>((resolve) => {
            players.forEach((player, index) => {
                player.once("gameSync", (sync: GameSyncObject) => {
                    if (sync.is_turn){
                        turn = index;
                    }
                    if (index === turn){
                        resolve(sync);
                    }
                })
            })

            current_player.emit("resync");
        });

        const syringe = sync.hand.find(c => c.suit === "syringe");
        return syringe !== undefined;
    }

    async function stallUntilSyringeHand(){
        while (!(await currentTurnHasSyringe())){
            await send_pass_request("left");
            await send_pass_hand_responses("left");
        }
        const syringe = hands[turn].find(c => c.suit === "syringe");
        return syringe!.id;
    }

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