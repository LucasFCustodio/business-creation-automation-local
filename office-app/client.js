import { io } from "socket.io-client";

const socket = io('http://localhost:8000');

socket.on("connect", () => {
    console.log("connected to the server");
})

socket.on("connect.error", (err) => {
    console.log("connection error: ", err);
})