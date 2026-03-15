import { io } from "socket.io-client";
import notifier from 'node-notifier';

const socket = io('http://localhost:8000');

socket.on("connect", () => {
    console.log("connected to the server");
})

socket.on('incoming-request', (data) => {
    console.log(`Received new request for business: ${data.businessName}`);

    // Trigger the native OS notification
    notifier.notify({
        title: 'New SunBiz Filing Available',
        message: `${data.businessName} is ready. Click to claim!`,
        sound: true,  // Plays the default system notification sound
        wait: true    // Keeps the Node process waiting for a click interaction
    });
});

socket.on("connect.error", (err) => {
    console.log("connection error: ", err);
})