import { Card } from "../game/card";
import { Player } from "../game/player";

type events = "";

export class GamePlayer extends Player {
    hand: Card[] = [];
}