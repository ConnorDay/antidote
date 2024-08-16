export type Formula = "serum_n" | "oslers_oil" | "rubiximab" | "c9_tonic" | "bootheide" | "w2_rose" | "mx_vile" | "agent_u";
export type SpecialCards = "syringe";
export type ActionType = "discard" | "trade" | "use" | "pass";

export interface TurnSelectObject {
    action: ActionType;
    argument?: string;
}

export interface TurnActionObject {

}

export interface HandQuery {
    message: string;
    destination?: string;
    can_reject: boolean;
}