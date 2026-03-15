import express from 'express';
const app = express();
// CRITICAL: Needed to parse incoming Pipefy webhooks
app.use(express.json({ type: '*/*' }));

import { Server } from 'socket.io';
import 'dotenv/config';
import dateFormat from "dateformat";

const expressServer = app.listen(8000);
const io = new Server(expressServer, {
    cors: { origin: '*' } //let's the laptop connect
});

let jobs = [];

//TEST ROUTE TO SIMULATE PIPEFY WEBHOOK
app.get("/test-webhook", (req, res) => {
    console.log("Simulating Pipefy Webhook...");

    let job = {
        jobId: `job_${Date.now()}`, 
        businessName: 'Race Test LLC'
    }
    
    jobs.push(job); // Add it to the active list

    // Broadcast to ALL connected clients
    io.emit("incoming-request", { 
        jobId: job.jobId, 
        businessName: job.businessName 
    });

    res.send("Job broadcasted to all workers!");
})




//POST REQUEST LOGIC FROM PIPEFY TO PROPERLY HANDLE DATA
// --- THE PIPEFY WEBHOOK ROUTE ---
app.post("/solicitacao-estadual", async (req, res) => {
    // 1. Immediately send response to Pipefy so it doesn't time out
    res.status(200).send("Webhook received. Processing and broadcasting to workers.");
    
    var address = "2335 E Atlantic Blvd #300-20";
    var city = "Pompano Beach";
    var zipCode = "33062";
    var country = "US";
    const data = req.body;
    console.log("Received data from Pipefy:", data);
    const rushProcess = data["rushProcess"];

    const cardID = data["cardID"];

    const now = new Date()
    const effectiveDate = dateFormat(now, "isoDateTime");
    const dateParts = effectiveDate.split("-");
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2].slice(0, 2);

    const businessName = data["businessName"];
    const businessType = data["companyType"];

    const useTbAddress = data["tbBusinessAddress"]; 
    var businessState;
    var otherState = data["otherState"];
    if (useTbAddress === "No" || useTbAddress === "no") {
        address = data["addressNumber"] + " " + data["streetName"];
        city = data["city"];
        businessState = data["businessState"];
        if(businessState === "Florida" || businessState === "florida"){
            businessState = "FL";
        }
        else if (businessState === "Delaware" || businessState === "delaware") {
            businessState = "DE";
        }
        else {
            console.log("Not a Florida State... Stopping Application!");
            return; 
        }
        zipCode = data["zipCode"];
        country = "USA";
    }
    else {
        console.log("Using TB Financial Service Business Address"); 
        businessState = "FL";
    }

    const ownerFirstName = data["firstName"];
    const ownerLastName = data["lastName"];
    const ownerSignature = ownerFirstName + " " + ownerLastName;
    const ownerPhoneNumber = data["phoneNumber"];
    const ownerEmail = data["email"];

    const emailTB = "info@tbfinancialservice.com";

    var partnerType = data["partnerType"];
    var partnerFirstNameString;
    var partnerFirstNameList;
    var partnerLastNameString;
    var partnerLastNameList;
    var numberOfPartners;

    var partnerAddressNumberString;
    var partnerStreetNameString;
    var partnerCityString;
    var partnerStateString;
    var partnerZipCodeString;
    var partnerCountryString;

    var partnerAddressNumberList;
    var partnerStreetNameList;
    var partnerCityList;
    var partnerStateList;
    var partnerZipCodeList;
    var partnerCountryList;

    if (partnerType == "Individuals (Pessoas físicas)") {
        partnerFirstNameString = data["partnerFirstName"];
        partnerFirstNameList = partnerFirstNameString.split(", ");
        partnerLastNameString = data["partnerLastName"];
        partnerLastNameList = partnerLastNameString.split(", ");
        numberOfPartners = partnerFirstNameList.length;

        partnerAddressNumberString = data["partnerAddressNumber"];
        partnerStreetNameString = data["partnerStreetName"];
        partnerCityString = data["partnerCity"];
        partnerStateString = data["partnerState"];
        partnerZipCodeString = data["partnerZipCode"];
        partnerCountryString = data["partnerCountry"];
    
        partnerAddressNumberList = partnerAddressNumberString.split(", ");
        partnerStreetNameList = partnerStreetNameString.split(", ");
        partnerCityList = partnerCityString.split(", ");
        partnerStateList = partnerStateString.split(", ");
        partnerZipCodeList = partnerZipCodeString.split(", ");
        partnerCountryList = partnerCountryString.split(", ");
    }
    else if (data["partnerType"] == "Companies (Empresas)") {
        partnerFirstNameString = data["businessPartnerName"];
        partnerFirstNameList = partnerFirstNameString.split(", ");
        numberOfPartners = partnerFirstNameList.length;

        partnerAddressNumberString = data["businessPartnerAddressNumber"];
        partnerStreetNameString = data["businessPartnerStreetName"];
        partnerCityString = data["businessPartnerCity"];
        partnerStateString = data["businessPartnerState"];
        partnerZipCodeString = data["businessPartnerZipCode"];
        partnerCountryString = data["businessPartnerCountry"];
    
        partnerAddressNumberList = partnerAddressNumberString.split(", ");
        partnerStreetNameList = partnerStreetNameString.split(", ");
        partnerCityList = partnerCityString.split(", ");
        partnerStateList = partnerStateString.split(", ");
        partnerZipCodeList = partnerZipCodeString.split(", ");
        partnerCountryList = partnerCountryString.split(", ");
    }
    else {
        numberOfPartners = 0;
    }

    const completeData = {
        cardInfo: { ID: cardID },
        effectiveDate: { day: day, month: month, year: year },
        business: {
            name: businessName,
            type: businessType,
            address: address, 
            city: city,
            state: businessState,
            zip: zipCode,
            country: country,
            otherState: otherState
        },
        owner: {
            firstName: ownerFirstName,
            lastName: ownerLastName,
            signature: ownerSignature,
            phoneNumber: ownerPhoneNumber,
            email: ownerEmail
        },
        partner: {
            type: partnerType,
            numberOfPartners: numberOfPartners,
            firstNameList: partnerFirstNameList,
            lastNameList: partnerLastNameList,
            addressNumberList: partnerAddressNumberList,
            streetNameList: partnerStreetNameList,
            cityList: partnerCityList,
            stateList: partnerStateList,
            zipCodeList: partnerZipCodeList,
            country: partnerCountryList
        },
        general: { email: emailTB },
        checks: {
            rushProcess: rushProcess,
            tbAddress: useTbAddress
        }
    };

    // --- THE NEW QUEUEING LOGIC ---
    // 2. Package the job with the full parsed data
    const jobId = `job_${Date.now()}`;
    const newJob = {
        jobId: jobId, 
        businessName: completeData.business.name,
        payload: completeData // Store the heavy data on the server until someone wins
    };
    
    jobs.push(newJob); 

    // 3. Broadcast ONLY the basic info to trigger the notification
    io.emit("incoming-request", { 
        jobId: newJob.jobId, 
        businessName: newJob.businessName 
    });
});

// --- SOCKET.IO RACE LOGIC ---
io.on('connection', (socket) => {
    console.log(`A user connected with socket id ${socket.id}`);

    socket.on("accept-job", (data) => {
        const jobIndex = jobs.findIndex(job => job.jobId === data.jobId);
        
        if (jobIndex !== -1) {
            // They won! Grab the full payload before deleting the job
            const wonJob = jobs[jobIndex];
            jobs.splice(jobIndex, 1);
            
            // Send the success message WITH the massive payload
            socket.emit("job-success", { 
                jobId: wonJob.jobId,
                payload: wonJob.payload // This is what Puppeteer will use!
            });
        } else {
            // They lost the race
            socket.emit("job-fail", { jobId: data.jobId });
        }
    });
});