import React from 'react';
import { CodeEnter } from "../../components";
import { Global } from "../../Global";

function Homepage() {
    return (
        <div className="homescreen">
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
                    Global.setDisplay(<Lobby />);
                }}
            />
        </div>
    );
}

export {Homepage};
