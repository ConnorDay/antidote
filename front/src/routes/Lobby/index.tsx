import React, { useEffect, useState } from 'react';
import { Global, Pages } from '../../Global'
import { LobbySyncObject } from '../../../../common/sync-objects'
import "./Lobby.css";

function isReady(ready: boolean) {
    if (ready) {
        return <span className='lobby-ready'>(ready)</span>;
    }
    return <span className='lobby-not-ready'>(not ready)</span>;
};

function handleReady() {
    const { socket } = Global;
    socket.emit("toggleReady");
}

function handleStart() {
    const { socket } = Global;
    socket.emit("toggleTimer")
}

function processTime(all_ready: boolean, time?: number) {
    if (!all_ready){
        return "Waiting for players to ready";
    }
    if (time === undefined) {
        return "Waiting for host to start";
    }
    return `${time}`;
}

function Lobby() {
    const { socket, setDisplay, connectionInfo } = Global;
    const {name} = connectionInfo;

    const [players, setPlayers] = useState<LobbySyncObject[]>([]);
    const [start_time, setTime] = useState<number>();
    const [display_time, setDisplayTime] = useState<number>();
    const [all_ready, setAllReady] = useState<boolean>(false);

    useEffect(() => {
        socket.on("lobbySync", (playerList: LobbySyncObject[]) => {
            setPlayers(playerList);
            setAllReady( playerList.every( (p) => p.ready ) )
        });
        socket.on("roundTimerStart", (start: number) => {
            console.log(start);
            setTime(start);
        })
        socket.on("roundTimerStop", () => {
            setTime(undefined);
            setDisplayTime(undefined);
        })
        socket.on("roomChange", () => {
            setDisplay(Pages.Game);
        })

        return () => {
            socket.removeListener("lobbySync");
            socket.removeListener("roundTimerStart");
            socket.removeListener("roundTimerStop");
            socket.removeListener("startLoading");
        };
    }, []);

    useEffect(() => {
        if (start_time === undefined) {
            return;
        }

        const interval = setInterval(() => {
            let calc_time = start_time - Date.now();
            calc_time /= 1000;
            calc_time = Math.ceil(calc_time);
            calc_time = Math.max(0, calc_time)

            setDisplayTime(calc_time);
        })
        return () => {
            clearInterval(interval);
        }
    }, [start_time]);

    const playersHTML = [];
    for (let i = 0; i < players.length; i++) {
        playersHTML.push(<p key={`player-${i}`}>{players[i].name} {isReady(players[i].ready)}</p>)
    }

    return (
        <main className='lobby-main'>
            <div className='lobby-header'>
                <h2> Room Code: {Global.connectionInfo.code}</h2>
            </div>
            <div className='lobby-content'>
                <aside className='lobby-players'>
                    <h2> Players: </h2>
                    <div className='lobby-player-list'>
                        {playersHTML}
                    </div>
                </aside>
                <section className='lobby-configuration'>
                    <div className='lobby-timer'>{processTime(all_ready, display_time)}</div>
                    <div className='lobby-options'>Game options will go here eventually :)</div>
                    <button onClick={() => handleReady()}>Ready</button>
                    {all_ready && players[0]?.name === name ? <button onClick={() => handleStart()}>Start</button> : undefined}
                </section>
            </div>
        </main>
    );
}

export { Lobby };