import React from 'react';
import { io } from "socket.io-client";
import { CodeEnter } from "../../components";
import { Pages, Global } from "../../Global";
import { Lobby } from "../Lobby";

function Homepage() {
    return (
        <div className="homepage">
            <CodeEnter
                onSubmit={(code: string, name: string) => {
                    Global.connectionInfo = { code, name };
                    Global.socket = io(
                        `${process.env.REACT_APP_HOST}:${process.env.REACT_APP_PORT}`,
                        {
                            query: {
                                name,
                                code,
                            },
                        }
                    );

                    Global.socket.on("disconnect", () => {
                        Global.setDisplay(Pages.Homepage);
                    })

                    Global.setDisplay(Pages.Lobby);
                }}
            />
        </div>
    );
}

export { Homepage };
