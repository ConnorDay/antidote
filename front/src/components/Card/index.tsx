import "./Card.css";
import { CardObject } from "../../../../common/sync-objects";

export interface CardProps {
    card: CardObject;
    onClick?: (card: CardObject) => void;
    glow: boolean;
}

export function Card(props: CardProps) {
    const { card, onClick, glow } = props;

    const handleOnClick = () => {
        if (onClick !== undefined) {
            onClick(card);
        }
    }

    return <div onClick={() => handleOnClick()} className={`card ${glow ? "card-glow" : null}`}>
        <span>{card.suit}</span>
        <span>{card.value}</span>
    </div>
}