import { useState } from "react";
import "./CodeEnter.css";

function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
    onSubmit: (code: string, name: string) => void,
    code: string,
    setCode: (text: string) => void,
    name: string,
    setName: (text: string) => void
) {
    //Prevent the page from reloading
    e.preventDefault();

    //Clear text inputs
    setCode("");
    setName("");

    //Call the callback
    onSubmit(code, name);
}

function handleTextChange(
    event: React.ChangeEvent<HTMLInputElement>,
    setText: (text: string) => void
) {
    //Check if the new text has an invalid character (non-alphanumeric)
    const isInvalid = /[^a-z0-9\-\_]+/i.test(event.target.value);

    //Only set the new text if it is valid
    if (!isInvalid) {
        setText(event.target.value);
    }
}

type Props = {
    onSubmit: (code: string, name: string) => void;
};

function CodeEnter(props: Props) {
    const [codeInputText, setCodeInputText] = useState("");
    const [nameInputText, setNameInputText] = useState("");

    const { onSubmit } = props;

    return (
        <form
            className="CodeEnter"
            onSubmit={(e) =>
                handleSubmit(
                    e,
                    onSubmit,
                    codeInputText,
                    setCodeInputText,
                    nameInputText,
                    setNameInputText
                )
            }
        >
            <label htmlFor="nameInput">Please enter a name: </label>
            <input
                type="text"
                id="nameInput"
                onChange={(event) => handleTextChange(event, setNameInputText)}
                value={nameInputText}
            ></input>
            <label htmlFor="codeInput">Please enter a code: </label>
            <input
                type="text"
                id="codeInput"
                onChange={(event) => handleTextChange(event, setCodeInputText)}
                value={codeInputText}
            />
            <button type="submit" className="CodeEnter-Button">
                Submit
            </button>
        </form>
    );
}

export { CodeEnter };