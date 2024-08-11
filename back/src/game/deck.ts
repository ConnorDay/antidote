/**
 * items[0] is the "top" of the deck
 */
export class Deck<T>{
    items: T[];

    constructor( items?: T[]){
        if (items === undefined){
            items = [];
        }
        this.items = items;
    }

    shuffle(){
        const new_items: T[] = [];

        while ( this.items.length > 0 ) {
            const random_index = Math.floor( Math.random() * this.items.length );
            const selected_item = this.items.splice( random_index, 1 )[0]

            new_items.push(selected_item)
        }

        this.items = new_items
    }

    add(item: T, index?: number){
        if (index === undefined){
            index = 0;
        }
        let item_index = 0;

        const new_items: T[] = []
        for (let i = 0; i < this.items.length + 1; i ++){
            if (i == index){
                new_items.push(item);
            } else {
                new_items.push(this.items[item_index]);
                item_index++;
            }
        }

        this.items = new_items;
    }

    draw(amount: number, index?: number){
        if (index === undefined){
            index = 0;
        }


        const selected = this.items.splice( index, amount );

        return selected;
    }

    get length(){
        return this.items.length;
    }
}