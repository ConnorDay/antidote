import { beforeAll, describe, expect, test } from "@jest/globals";
import { io, Socket } from "socket.io-client";
import { ActionSyncObject, CardObject, GameSyncObject, LoadingSyncObject, LobbySyncObject } from "../../common/sync-objects";
import { HandQuery, TurnSelectObject } from "../../common/antidote-objects";

const players: Socket[] = [];
const hands: CardObject[][] = [];
const workstations: CardObject[][] = [];
let turn = -1;

async function expectAllPredicate(predicate: (player: Socket) => Promise<void>) {
    const promises: Promise<void>[] = [];
    players.forEach(player => {
        promises.push(predicate(player));
    });

    await Promise.all(promises);
}

async function addPlayer(check_ready: boolean = true) {
    const next_player = players.length;
    const player = io(
        "ws://localhost:8000",
        {
            query: {
                name: `player${next_player + 1}`,
                code: "1234"
            }
        }
    );
    players.push(player);

    await expectAllPredicate(async (player: Socket) => {
        return new Promise((resolve) => {
            player.once("lobbySync", (sync: LobbySyncObject[]) => {
                expect(sync).toBeDefined();
                expect(sync.length).toBe(players.length);

                sync.forEach((record, index) => {
                    expect(record.name).toBe(`player${index + 1}`);
                    if (check_ready) {
                        expect(record.ready).toBe(false);
                    }
                    expect(record.id).toBeDefined();
                });

                resolve();
            })

        });
    });
}

afterAll(() => {
    players.forEach((socket) => {
        socket.close();
    });
});

describe("Lobby Testing", () => {
    test("Player 1 connect to server", async () => {
        await addPlayer();
    });
    test("Player 2 connect to server", async () => {
        await addPlayer();
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

    test("Player leave sync", async () => {
        const player = players.pop();
        player!.close();

        await new Promise<void>((resolve) => {
            players[0].once("lobbySync", (sync) => {
                expect(sync).toBeDefined();
                expect(sync.length).toBe(1);
                expect(sync[0].name).toBe("player1");
                expect(sync[0].ready).toBe(false);
                expect(sync[0].id).toBeDefined();

                resolve();
            });
        });
    });

    test("Add 4 more players", async () => {
        for (let i = 0; i < 4; i++) {
            await addPlayer();
        }
    })

    test("Able to ready up", async () => {
        players[0].emit("toggleReady");

        await expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("lobbySync", (sync: LobbySyncObject[]) => {
                    sync.forEach((record, index) => {
                        expect(record.id).toBeDefined();
                        expect(record.name).toBe(`player${index + 1}`);
                        expect(record.ready).toBe(index == 0);
                    });

                    resolve();
                });
            })
        });
    });

    test("Non host player can't toggle", async () => {
        const error_timer = new Promise<void>((resolve, reject) => {
            players[1].once("error", ({ message }) => {
                expect(message).toBe("only the host is able to toggle the round timer");
                resolve();
            });
        });
        const lobby_timer = new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                players[1].off("roundTimerStart");
                resolve();
            }, 500);
            players[1].once("roundTimerStart", () => {
                clearTimeout(timer);
                reject();
            });
        });

        players[1].emit("toggleTimer");

        await Promise.all([error_timer, lobby_timer]);
    });

    test("Host player can't toggle", async () => {
        const error_timer = new Promise<void>((resolve, reject) => {
            players[0].once("error", ({ message }) => {
                expect(message).toBe("not all players are ready");
                resolve();
            });
        });
        const lobby_timer = new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                players[0].off("roundTimerStart");
                resolve();
            }, 500);
            players[0].once("roundTimerStart", () => {
                clearTimeout(timer);
                reject();
            });
        });

        players[0].emit("toggleTimer");

        await Promise.all([error_timer, lobby_timer]);
    });

    test("All players ready", async () => {
        for (let i = 1; i < players.length; i++) {
            players[i].emit("toggleReady");

            await expectAllPredicate(async (player) => {
                return new Promise((resolve) => {
                    player.once("lobbySync", (sync: LobbySyncObject[]) => {
                        sync.forEach((record, index) => {
                            expect(record.id).toBeDefined();
                            expect(record.name).toBe(`player${index + 1}`);
                            expect(record.ready).toBe(index <= i);
                        });

                        resolve();
                    });
                })
            });
        }
    });

    test("Non host player can't toggle timer", async () => {
        const error_timer = new Promise<void>((resolve, reject) => {
            players[1].once("error", ({ message }) => {
                expect(message).toBe("only the host is able to toggle the round timer");
                resolve();
            });
        });
        const lobby_timer = new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                players[1].off("roundTimerStart");
                resolve();
            }, 500);
            players[1].once("roundTimerStart", () => {
                clearTimeout(timer);
                reject();
            });
        });

        players[1].emit("toggleTimer");

        await Promise.all([error_timer, lobby_timer]);
    });

    test("Host starts timer", async () => {
        const times = new Set();
        const lobby_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("roundTimerStart", (start: number) => {
                    times.add(start);
                    resolve();
                });
            });
        });

        players[0].emit("toggleTimer");

        await lobby_timer;

        expect(times.size).toBe(1);
    });

    test("Host cancels timer", async () => {
        const lobby_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("roundTimerStop", () => {
                    resolve();
                });
            });
        });

        players[0].emit("toggleTimer");

        await lobby_timer;
    });

    test("Host starts timer", async () => {
        const times = new Set();
        const lobby_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("roundTimerStart", (start: number) => {
                    times.add(start);
                    resolve();
                });
            });
        });

        players[0].emit("toggleTimer");

        await lobby_timer;

        expect(times.size).toBe(1);
    });

    test("Player leaves after timer", async () => {
        const leaver = players.pop();

        const sync_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("lobbySync", (sync: LobbySyncObject[]) => {
                    sync.forEach((record, index) => {
                        expect(record.id).toBeDefined();
                        expect(record.name).toBe(`player${index + 1}`);
                        expect(record.ready).toBe(true);
                    });

                    resolve();
                });
            })
        });
        const lobby_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("roundTimerStop", () => {
                    resolve();
                });
            });
        });

        leaver?.close();

        await Promise.all([sync_timer, lobby_timer]);
    });

    test("Host starts timer", async () => {
        const times = new Set();
        const lobby_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("roundTimerStart", (start: number) => {
                    times.add(start);
                    resolve();
                });
            });
        });

        players[0].emit("toggleTimer");

        await lobby_timer;

        expect(times.size).toBe(1);
    });

    test("Player joins after ready", async () => {
        const timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("roundTimerStop", () => {
                    resolve();
                });
            });
        });

        await addPlayer(false);
        await timer;
    });

    test("Start round", async () => {
        const lobby_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("lobbySync", (sync: LobbySyncObject[]) => {
                    sync.forEach((record, index) => {
                        expect(record.id).toBeDefined();
                        expect(record.name).toBe(`player${index + 1}`);
                        expect(record.ready).toBe(true);
                    });

                    resolve();
                });
            })
        });
        players[4].emit("toggleReady");
        await lobby_timer;

        players[0].emit("toggleTimer");

        const time_start = await new Promise<number>((resolve) => {
            players[0].once("roundTimerStart", (time: number) => {
                resolve(time);
            });
        });

        const finish_times: number[] = [];
        await expectAllPredicate(async (player) => {
            return new Promise((resolve, reject) => {
                player.once("roomChange", () => {
                    finish_times.push(Date.now());
                    resolve();
                });
            });
        });

        finish_times.forEach((time) => {
            expect(time).toBeGreaterThanOrEqual(time_start);
        });

    }, 8000);

    test("One player loaded", async () => {
        const sync_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("loadingSync", (sync: LoadingSyncObject[]) => {
                    sync.forEach((record, index) => {
                        expect(record.id).toBeDefined();
                        expect(record.name).toBe(`player${index + 1}`);
                        expect(record.connected).toBe( index == 0 );
                    });

                    resolve();
                });
            })
        });

        players[0].emit("loaded");
        await sync_timer;
    });

    test("Player can't load in multiple times", async () => {
        const error_timer = new Promise<void>((resolve, reject) => {
            players[0].once("error", ({ message }) => {
                expect(message).toBe("Already connected into room.");
                resolve();
            });
        });
        const lobby_timer = new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                players[0].off("loadingSync");
                resolve();
            }, 500);
            players[0].once("loadingSync", () => {
                clearTimeout(timer);
                console.error("sync message was still sent");
                reject();
            });
        });

        players[0].emit("loaded");

        await Promise.all([error_timer, lobby_timer]);
    });

    test("The rest of the players load in", async () => {

        players.forEach(() => {
            hands.push([]);
            workstations.push([]);
        })

        const game_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("gameSync", (sync: GameSyncObject) => {

                    const player_index = players.findIndex( p => p.id === player.id );
                    hands[player_index] = sync.hand;
                    workstations[player_index] = sync.workstation;

                    if (sync.is_turn){
                        expect(turn).toBe(-1);
                        turn = player_index;
                    }

                    resolve();
                });
            })
        });

        let index = 1;
        for (let player of players){
            if (player.id === players[0].id){
                continue;
            }


            const sync_timer = expectAllPredicate(async (player) => {
                return new Promise((resolve) => {
                    player.once("loadingSync", (sync: LoadingSyncObject[]) => {
                        sync.forEach((record, i) => {
                            expect(record.id).toBeDefined();
                            expect(record.name).toBe(`player${i+ 1}`);
                            expect(record.connected).toBe( i <= index );
                        });

                        resolve();
                    });
                })
            });

            player.emit("loaded");
            await sync_timer;

            index++;
        }

        await game_timer;
    });

    test("Hands are the same size", () => {
        const size = hands[0].length;

        hands.forEach( hand => {
            expect(hand.length).toBe(size);
        });
    });

    test("able to determine antidote", () => {
        const suits = new Set<string>();
        const x_cards: string[] = [];
        hands.forEach( hand => {
            hand.forEach( card => {
                expect(card.suit).toBeDefined();
                if (!card.suit) return;

                if (card.suit !== "syringe"){
                    suits.add( card.suit )
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
    });

    test("Send discard request", async () => {
        const sync_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("handQuery", (query: HandQuery) => {
                    expect(query.can_reject).toBe(false);
                    expect(query.message).toBe("Discard a card");
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
            action: "discard"
        }
        players[turn].emit("turnSelect", select);
        await Promise.all([sync_timer, action_timer]);
    });

    test("Everyone discards", async () => {
        const sync_timer = expectAllPredicate(async (player) => {
            return new Promise((resolve) => {
                player.once("gameSync", (sync: GameSyncObject) => {
                    const player_index = players.findIndex( p => p.id === player.id );
                    hands[player_index] = sync.hand;
                    workstations[player_index] = sync.workstation;

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

            const regular_card = hands[i].find((c) => {return c.value !== "x" && c.suit !== "syringe"});

            players[i].emit("handResponse", regular_card!.id);

            await action_timer;
        }

        await sync_timer;
    });

    test("Workstation has a card", () => {
        workstations.forEach( station => {
            expect(station.length).toBe(1);
        });
    });

    test("Send pass request (left)", async () => {
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
            argument: "left"
        }
        players[turn].emit("turnSelect", select);
        await Promise.all([sync_timer, action_timer]);
    })

    test("Pass to left", async () => {
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
            to_expect[ (i + to_expect.length - 1) % to_expect.length ] = hands[i][0].id;

            await action_timer;
        }

        await sync_timer;

    });
});