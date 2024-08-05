import React, { useState } from "react";
import { Homepage } from './routes/Homepage';
import { Lobby } from './routes/Lobby';
import { Pages, Global } from './Global';
import './App.css';
import { Game } from "./routes/Game";

function App() {
    //Set the default display to be the homescreen. When a code/ name is submitted, change to the lobby and pass along the connection info
    const [toDisplay, setDisplay] = useState(Pages.Homepage);

    if (Global.setDisplay === undefined) {
        Global.setDisplay = setDisplay;
    }

    let page: JSX.Element;
    page = <Homepage />;
    switch (toDisplay) {
        case Pages.Homepage:
            page = <Homepage />;
            break;
        case Pages.Lobby:
            page = <Lobby />
            break;
        case Pages.Game:
            page = <Game />
            break;
    }
    return (
        <div className="App">
            <header className="App-header">
                {page}
            </header>
        </div>
    );
}

export default App;
