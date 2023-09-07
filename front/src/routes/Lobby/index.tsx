import React, { useEffect, useState } from 'react';
import { Global } from '../../Global'
import { LobbySyncObject } from '../../../../common/sync-objects'

function Lobby() {
    const { socket } = Global;

    const [players, setPlayers] = useState<LobbySyncObject[]>([]);
    console.log(players);
    useEffect(() => {
        socket.on("lobbySync", (playerList) => {
            setPlayers(playerList);
        });

        return () => {
            socket.removeListener("lobbySync");
        };
    }, []);
    
    const playersHTML = [];
    for (let i=0; i<players.length; i++){
        playersHTML.push(<p key={i}>{players[i].name}</p>)
    }

    return (
        <div>
            <p> Room Code: { Global.connectionInfo.code }</p>
            <p> Name: </p>
            { playersHTML }
        </div>
    );
}

export { Lobby };