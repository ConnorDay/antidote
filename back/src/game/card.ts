import { randomUUID } from "crypto";

export class Card {
    suit?: string;
    value?: string;
    id: string = randomUUID();

    constructor(suit?: string, value?: string) {
        this.suit = suit;
        this.value = value;
    }
}