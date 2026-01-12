import express from "express";
import 'dotenv/config';
import { fillSunBizForm } from "./sunbizBot.js";

const app = express();
const PORT = 3000;

app.use(express.json({ type: '*/*' }));

app.get("/", (req, res) => {
    res.send("The port is working")
});

app.post("/solicitacao-estadual", (req, res) => {
    console.log("Raw Data received from Pipefy: " + req.body);
    const data = req.body;

    //Date Section - Break down date into individual parts
    const effectiveDate = data["effectiveDate"];
    const dateParts = effectiveDate.split("-");
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2].slice(0, 2);


    //Business Section
    const businessName = data["businessName"];
    const businessType = data["companyType"];


    //Business Address Section - Break down address into individual parts
    const businessAddress = data["businessAddress"];
    const addressParts = businessAddress.split(", ");
    const stateAndZip = addressParts[2].split(" ");
    const stateAndZipLength = stateAndZip.length;
    const country = "USA";
    var businessState;
    var zip;
    const city = addressParts[1];
    const address = addressParts[0];
    //If the state has more than one word, then the first two words are the state name. If it's just one word, then it's just the first word
    if (stateAndZipLength == 3) {
        businessState = stateAndZip[0] + " " + stateAndZip[1];
        zip = stateAndZip[2];
    }
    else {
        businessState = stateAndZip[0];
        zip = stateAndZip[1];
    }


    //Owner Section - Break down the owner information into individual parts
    const ownerName = data["clientName"];
    const ownerNameParts = ownerName.split(" ");
    const ownerNamePartsLength = ownerNameParts.length;
    const ownerFirstName = ownerNameParts[ownerNamePartsLength - 1];
    const ownerLastName = ownerNameParts[0];
    const ownerNameInitial = ownerFirstName.slice(0, 1);
    const ownerSignature = ownerFirstName + " " + ownerLastName;


    //Our email
    const emailTB = "info@tbfinancialservice.com";


    //Partner Address Section - Break down the partner information into individual parts
    const partnerName = data["partnerName"];
    const partnerNameParts = partnerName.split(" ");
    const partnerNamePartsLength = partnerNameParts.length;
    const partnerFirstName = partnerNameParts[0];
    const partnerLastName = partnerNameParts[partnerNamePartsLength - 1];
    const partnerNameInitial = partnerFirstName.slice(0, 1);
    //Partner Name Section
    var partnerAddress;
    var partnerAddressParts;
    var partnerStateAndZip;
    var partnerStateAndZipLength;
    const partnerCountry = "USA";
    var partnerState;
    var partnerZip;
    var partnerCity;
    if (data["samePartnerAddress"] === "Yes") {
        partnerAddress = businessAddress;
        partnerState = businessState;
        partnerZip = zip;
        partnerCity = city;
    }
    else {
        partnerAddress = data["differentPartnerAddress"];
        partnerAddressParts = partnerAddress.split(", ");
        partnerStateAndZip = partnerAddressParts[2].split(" ");
        partnerStateAndZipLength = partnerStateAndZip.length;
        if (partnerStateAndZipLength == 3) {
            partnerState = partnerStateAndZip[0] + " " + partnerStateAndZip[1];
            partnerZip = partnerStateAndZip[2];
        }
        else {
            partnerState = partnerStateAndZip[0];
            partnerZip = partnerStateAndZip[1];
        }
        partnerCity = partnerAddressParts[1];
    }

    
    //All information that needs to be used on SunBiz is correct. Only need some info which was not available
    console.log(`Month: ${month}, Day: ${day}, Year: ${year}\nBusiness Type: ${businessType}\nBusiness Name: ${businessName}\nBusiness Address: ${businessAddress}\n\n`);
    console.log(`Here comes the business address in parts:\Address: ${address}, City: ${city}, State: ${businessState}, Zip Code: ${zip}, Country: ${country}\n\n`);
    console.log(`Here comes the owner name information in parts:\nfirst name: ${ownerFirstName}, last name: ${ownerLastName}, initial: ${ownerNameInitial}, signature: ${ownerSignature}\n`);
    console.log(`TB Email: ${emailTB}\n`);
    console.log(`Here comes the partner name information in parts:\nfirst name: ${partnerFirstName}, last name: ${partnerLastName}, initial: ${partnerNameInitial}\n`);
    console.log(`Here comes the partner address in parts:\nCity: ${partnerCity}, State: ${partnerState}, Zip Code: ${partnerZip}, Country: ${partnerCountry}\n\n`);
    console.log("Does partner have the same address?" + data["samePartnerAddress"]);

    //Notify the server the response was successfully received
    res.status(200).send("HTTP request sucessfully received from Pipefy");

    //Store everything into completeData variable, and call the SunBiz function
    const completeData = {
        effectiveDate: {
            day: day,
            month: month,
            year: year
        },
        business: {
            name: businessName,
            type: businessType,
            address: address, // street name, building #, and suite #
            city: city,
            state: businessState,
            zip: zip,
            country: country
        },
        owner: {
            firstName: ownerFirstName,
            lastName: ownerLastName,
            initial: ownerNameInitial,
            signature: ownerSignature
        },
        partner: {
            firstName: partnerFirstName,
            lastName: partnerLastName,
            initial: partnerNameInitial,
            city: partnerCity,
            state: partnerState,
            zip: partnerZip,
            country: partnerCountry
        },
        general: {
            email: emailTB
        }
    };
    
    fillSunBizForm(completeData);
})

app.listen(PORT, () => {
    console.log(`App running on port ${PORT}`);
    //Will finish writing later
});