# Outbound
Outbound signals are signals that are sent from the browsers and received by the back end.

| Signal Name                               | Message Type         | Received In State |
| ----------------------------------------- | -------------------- | ----------------- |
| [`toggleReady`](#toggleready)             | `null`               | Lobby             |
| [`loaded`](#loaded)                       | `null`               | Loading           |
| [`turnAction`](#turnAction)               | `TurnActionObject`   | Game              |
| [`turnResponse`](#turnResponse)           | `TurnResponseObject` | Game              |
| [`handQueryResponse`](#handQueryResponse) | `string`             | Game              |

## toggleReady

`toggleReady` indicates to the server that the player is ready.

### MessageType
```typescript
null
```
## loaded

`loaded` indicates to the server that the client has finished loading everything needed to play the game.

### MessageType
```typescript
null
```

# Inbound
Inbound signals are signals that are sent from the back end and received by the browser.

| Signal Name                           | Message Type          | Received In State |
| ------------------------------------- | --------------------- | ----------------- |
| [`lobbySync`](#lobbysync)             | `LobbySyncObject[]`   | Lobby             |
| [`roundTimerStart`](#roundtimerstart) | `number`              | Lobby             |
| [`roundTimerStop`](#roundtimerstop)   | `null`                | Lobby             |
| [`startLoading`](#startloading)       | `null`                | Lobby             |
| [`loadingSync`](#loadingsync)         | `LoadingSyncObject[]` | Game              |
| [`gameSync`](#gameSync)               | `GameSyncObject`      | Game              |
| [`actionSync`](#actionSync)           | `ActionSyncObject`    | Game              |
| [`handQuery`](#handQuery)             | `HandQuery`           | Game              |

## lobbySync

`lobbySync` is to keep the client informed about when a player: connects, disconnects, or changes ready status

### MessageType
```typescript
interface LobbySyncObject {
    name: string;
    id: string;
    ready: boolean;
}
```

## roundTimerStart

`roundTimerStart` indicates that all players have readied up and that the game will begin soon. The number provided is the unix timestamp when the game should begin. 

No additional work needs to be done on the client side to progress the game, the number is purely cosmetic.

### MessageType
```typescript
number //unix timestamp
```

## roundTimerStop

`roundTimerStop` indicates that the state of the lobby has changed to no longer be able to start. This can be because a new player has join, or a player has unreadied. The client should no longer display the round timer countdown.

Currently the round timer will not stop if a player disconnects.

### MessageType
```typescript
null
```

## startLoading

`startLoading` indicates that the server has started the game and the client should begin loading whatever resources are necessary to display the game page.


### MessageType
```typescript
null
```

## loadingSync

`loadingSync` is to keep the client informed about when other players join the game.

It is possible for players to join or disconnect at this time

### MessageType
```typescript
interface LoadingSyncObject {
    name: string;
    id: string;
    connected: boolean;
}
```
