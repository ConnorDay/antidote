import React, { useState } from "react";
import { Homepage } from './routes/Homepage';
import { Lobby } from './routes/Lobby';
import { Pages, Global } from './Global';
import './App.css';

function App() {
    //Set the default display to be the homescreen. When a code/ name is submitted, change to the lobby and pass along the connection info
    const [toDisplay, setDisplay] = useState(Pages.Homepage);

    if (Global.setDisplay === undefined) {
        Global.setDisplay = setDisplay;
    }

    let page: JSX.Element;
    page = <Homepage />;
    switch (toDisplay) {
        case 0:
          page = <Homepage />;
          break;
        case 1:
          page = <Lobby />
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
