import { useEffect, useState } from "react";
import { Global } from "../../Global";
import { CardObject, GameSyncObject, PlayerStatusObject } from "../../../../common/sync-objects";
import { HandQuery } from "../../../../common/antidote-objects";
import "./Game.css";
import { Popup } from "../../components";
import { Card } from "../../components/Card";

function handlePlayerClick(player: PlayerStatusObject) {
    const { socket } = Global;
    socket.emit("turnSelect", {
        action: "trade",
        argument: player.id
    });
}

function parsePlayer(player: PlayerStatusObject, is_turn: boolean) {
    let glow = ""
    if (is_turn && !player.is_turn) {
        glow = " game-glow"
    }
    return <a className={"game-player" + glow} onClick={() => handlePlayerClick(player)} key={player.id}>{player.name}</a>
}

function parseCard(card: CardObject, is_turn: boolean, highlight_all: boolean) {
    let glow = ""
    let can_play_syringe = is_turn && card.suit === "syringe";
    if (can_play_syringe || highlight_all) {
        glow = " game-box-glow"
    }
    return <div className={"game-card" + glow} key={card.id}>
        <span>{card.suit}</span>
        <span>{card.value}</span>
    </div>
}

export function Game() {
    const { socket } = Global;
    const [players, setPlayers] = useState<PlayerStatusObject[]>([]);
    const [hand, setHand] = useState<CardObject[]>([]);
    const [query, setQuery] = useState<string>();
    const [is_turn, setTurn] = useState(false);

    useEffect(() => {
        socket.emit("loaded");

        socket.on("gameSync", (sync: GameSyncObject) => {
            console.log(sync);
            setHand(sync.hand);
            setPlayers(sync.players);
            setTurn(sync.is_turn);
        });
        socket.on("handQuery", (query: HandQuery) => {
            setQuery(query.message);
        })
        return () => {
            socket.removeListener("gameSync");
            socket.removeListener("handQuery");
        }
    }, []);
    return <div className="game-main">
        <Popup className="game-query-trade-popup" visible={query !== undefined}>
            <p>{query}</p>
            <button onClick={() => {
                socket.emit("handQueryResponse");
                setQuery(undefined);
            }}>Reject</button>
        </Popup>

        <Popup className={"game-pass-right-popup"} visible={is_turn}>
            <button className="game-glow game-button">Pass right</button>
        </Popup>

        <Popup className={"game-pass-left-popup"} visible={is_turn}>
            <button className="game-glow game-button">Pass Left</button>
        </Popup>

        <div className="game-workbenches">
            {players.map((player) => parsePlayer(player, is_turn))}
        </div>
        <div className="game-hand">
            <Popup className="game-discard" visible={is_turn}>
                <button className="game-discard game-button game-glow">Discard</button>
            </Popup>
            {hand.map((card) => <Card key={card.id} card={card} glow={query !== undefined} onClick={(card) => console.log(card)} />)}
        </div>
    </div>

}