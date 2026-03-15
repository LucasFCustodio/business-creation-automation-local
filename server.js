import express from 'express';
const app = express();
import { Server } from 'socket.io';
import 'dotenv/config';

const expressServer = app.listen(8000);
const io = new Server(expressServer, {
    cors: { origin: '*' } //let's the laptop connect
});

let jobs = [];

//Set up io connection
io.on('connection', (socket) => {
    console.log(`a user connected with socket id ${socket.id}`);

    setTimeout(() => {
        console.log("Simulating Pipefy Webhook");
        let job = {
            jobId: '01',
            businessName: 'Test Business'
        }
        jobs.push(job);

        io.emit("incoming-request", { jobId: job.jobId, businessName: job.businessName });
    }, 3000);

    socket.on("accept-job", (data) => {
        //Go through all the jobs in the array, and if you find a job with the same id the client is asking for, emit an accept message. If not, emit a fail message
        if (jobs.find(job => job.jobId === data.jobId)) {
            socket.emit("job-success", { jobId: data.jobId });
        } else {
            socket.emit("job-fail", { jobId: data.jobId });
        }
    })
});