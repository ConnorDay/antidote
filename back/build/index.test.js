"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const manager_1 = require("./game/manager");
const globals_1 = require("@jest/globals");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io_server = new socket_io_1.Server(server, {
    cors: {
        origin: "*"
    }
});
const manager = new manager_1.Manager(io_server);
beforeAll(() => {
    server.listen(8001, () => console.log("starting testing"));
});
afterAll(() => {
    server.closeAllConnections();
    server.close();
});
(0, globals_1.describe)("Connection Testing", () => {
    (0, globals_1.test)("Starts Listening", () => {
        (0, globals_1.expect)(server.listening).toBeTruthy();
    });
    server.close();
    (0, globals_1.test)("Stops Listening", () => {
        (0, globals_1.expect)(server.listening).toBeTruthy();
    });
});
