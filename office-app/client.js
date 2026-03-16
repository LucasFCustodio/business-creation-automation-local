import { io } from "socket.io-client";
import notifier from 'node-notifier';
import { fillSunBizForm } from "./llc-opening.js"; // Updated filename!

const socket = io('http://localhost:8000');

socket.on("connect", () => {
    console.log("connected to the server");
})

socket.on('incoming-request', (data) => {
    console.log(`Received new request for ${data.businessName}, with job id ${data.jobId}`);

    // Trigger the native OS notification
    notifier.notify({
        title: 'New SunBiz Filing Available',
        message: `${data.businessName} is ready. Click to claim!`,
        sound: true,  // Plays the default system notification sound
        wait: true    // Keeps the Node process waiting for a click interaction
        },
        (error, response, metadata) => {
            if (response === 'ok' || (metadata && metadata.activationType === 'clicked')) {
                console.log("Notification clicked. Attempting to accept the job")
                socket.emit("accept-job", { jobId: data.jobId });
            }
            else {
                console.log("Notification dismissed or failed to display");
            }
        }
    );
});

socket.on("job-success", (data) => {
    //This socket will receive the business data, and the bot will begin the application on their desktop
    console.log("Success! The job will start in your computer");
    fillSunBizForm(data.payload);
});

socket.on("job-fail", (data) => {
    //This socket will not receive any data, since another desktop already accepted the job, and their socket already received the information
    console.log(('Another worker already accepted the job request'));
});

socket.on("connect_error", (err) => {
    console.log("connection error: ", err);
})