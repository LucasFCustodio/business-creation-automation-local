import express from "express";
import 'dotenv/config';
import dateFormat, { masks } from "dateformat";
import { fillSunBizForm, moveCardToPhase } from "./sunbizBot.js";

const app = express();
const PORT = 3000;

app.use(express.json({ type: '*/*' }));

app.get("/", (req, res) => {
    res.send("The port is working")
});

app.post("/solicitacao-estadual", async (req, res) => {
    console.log("Raw Data received from Pipefy: " + req.body);
    const data = req.body;

    //Card ID
    const cardID = data["cardID"];

    //Date Section - Break down date into individual parts
    const now = new Date()
    const effectiveDate = dateFormat(now, "isoDateTime");
    const dateParts = effectiveDate.split("-");
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2].slice(0, 2);


    //Business Section
    const businessName = data["businessName"];
    const businessType = data["companyType"];


    //Business Address Section - Break down address into individual parts - THIS WILL CHANGE ONCE THEY FIX PIPEFY FORM
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
    const ownerPhoneNumber = data["phoneNumber"];
    const ownerEmail = data["email"];


    //Our email
    const emailTB = "info@tbfinancialservice.com";


    //Partner Name Section - Break down the partner information into individual parts -MIGHT CHANGE
    const partners = data["partnerName"];
    const partnerNames = partners.split("\n");
    const numberOfPartners = partnerNames.length;
    var partnerFullNameList = [];
    var partnerFirstNameList =[];
    var partnerLastNameList = [];
    var partnerNameInitialList = [];
    for (var i = 0; i < numberOfPartners; i++) {
        partnerFullNameList = partnerNames[i].split(" "); //Split parter i's first and last name
        partnerFirstNameList.push(partnerFullNameList[0]); //Store partner i's first name in the i-th position of the first name array
        partnerLastNameList.push(partnerFullNameList[partnerFullNameList.length - 1]); //Store partner i's last name in the i-th position of the last name array
        partnerNameInitialList.push(partnerFirstNameList[i].slice(0, 1));
    }
    //Partner Address Section - WILL CHANGE WHEN PIPEFY CHANGES
    var partnerAddresses;
    var partnerAddressesList = [];
    var partnerAddress = [];
    var partnerStateAndZip = [];
    const partnerCountry = "USA";
    var partnerAddressPart;
    var partnerState;
    var partnerZip;
    var partnerCity;
    var partnerAddressList = [];
    var partnerCityList = [];
    var partnerStateList = [];
    var partnerZipList = [];
    if (data["samePartnerAddress"] === "Yes") {
        partnerAddressList.push(address); // Use the split 'address' variable, not the full string
        partnerCityList.push(city);
        partnerStateList.push(businessState);
        partnerZipList.push(zip);
    }
    else {
        partnerAddresses = data["differentPartnerAddress"]; //Stores the string that has all partner addresses
        partnerAddressesList = partnerAddresses.split("\n"); //Contains all partner addresses in an array
        for (var i = 0; i < numberOfPartners; i++) {
            partnerAddress = partnerAddressesList[i].split(", "); // Stores each part of the i-th address
            partnerAddressPart = partnerAddress[0];
            partnerCity = partnerAddress[1]; //Stores the city for the current partner
            partnerStateAndZip = partnerAddress[2].split(" ");
            if (partnerStateAndZip.length == 3) {
                partnerState = partnerStateAndZip[0] + " " + partnerStateAndZip[1]; //Store state for current partner
                partnerZip = partnerStateAndZip[2]; //Stores ZIP for current partner
            }
            else {
                partnerState = partnerStateAndZip[0]; //Store state for current partner
                partnerZip = partnerStateAndZip[1]; //Store ZIP for current partner
            }
            partnerAddressList.push(partnerAddressPart);
            partnerCityList.push(partnerCity)
            partnerStateList.push(partnerState);
            partnerZipList.push(partnerZip);
        }
    }

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
            signature: ownerSignature,
            phoneNumber: ownerPhoneNumber,
            email: ownerEmail
        },
        partner: {
            numberOfPartners: numberOfPartners,
            firstNameList: partnerFirstNameList,
            lastNameList: partnerLastNameList,
            initialList: partnerNameInitialList,
            addressList: partnerAddressList,
            cityList: partnerCityList,
            stateList: partnerStateList,
            zipList: partnerZipList,
            country: partnerCountry
        },
        general: {
            email: emailTB
        }
    };

    //Fill out the form, and if it returns a 'success', then call the moveCardToPhase which activates the Make automatioion to move the card to the next phase - WILL CHANGE TO A DIFFERENT PROGRAM
    if (await fillSunBizForm(completeData) === "success") {
        console.log("Form completed successfully.");
    }
})

app.listen(PORT, () => {
    console.log(`App running on port ${PORT}`);
    //Will finish writing later
});