import express from 'express';
const app = express();
import { Server } from 'socket.io';
import 'dotenv/config';

const expressServer = app.listen(8000);
const io = new Server(expressServer, {
    cors: { origin: '*' } //let's the laptop connect
});

//Set up io connection
io.on('connection', (socket) => {
    console.log('a user connected');

    setTimeout(() => {
        console.log("Simulating Pipefy Webhook");
        io.emit("incoming-request", {
            jobId: '01',
            businessName: 'Test Business'
        }, 3000);
    })
})