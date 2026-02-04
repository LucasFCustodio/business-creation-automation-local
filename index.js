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

var address = "2335 E Atlantic Blvd #300-20";
var city = "Pompano Beach";
var zipCode = "33062";
var country = "USA";

app.post("/solicitacao-estadual", async (req, res) => {
    const data = req.body;
    console.log("Received data:", data);
    const rushProcess = data["rushProcess"];

    //Card ID - DONE
    const cardID = data["cardID"];


    //Date Section - Break down date into individual parts - DONE
    const now = new Date()
    const effectiveDate = dateFormat(now, "isoDateTime");
    const dateParts = effectiveDate.split("-");
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2].slice(0, 2);


    //Business Section - DONE
    const businessName = data["businessName"];
    const businessType = data["companyType"];


    //Business Address Section - Break down address into individual parts - TEST
    const useTbAddress = data["tbBusinessAddress"]; //Used to check if address will change to a personalized one, or if we just keep it at TB's financial address
    var businessState;
    var otherState = data["otherState"];
    if (useTbAddress === "No" || useTbAddress === "no") {
        address = data["addressNumber"] + " " + data["streetName"];
        city = data["city"];
        businessState = data["businessState"];
        if(businessState === "Florida" || businessState === "florida"){
            businessState = "FL";
        }
        else if (otherState === "Delaware" || otherState === "delaware") {
            businessState = "DE";
        }
        else {
            console.log("Not a Florida State... Stopping Application!");
            return; //This form should not be filled out if the business is not in Florida
        }
        zipCode = data["zipCode"];
        country = "USA";
    }
    else {
        console.log("Using TB Financial Service Business Address"); //TB address is already the default address, so don't need to do anything
        businessState = "FL";
    }


    //Owner Section - Break down the owner information into individual parts - TEST
    const ownerFirstName = data["firstName"];
    const ownerLastName = data["lastName"];
    const ownerSignature = ownerFirstName + " " + ownerLastName;
    const ownerPhoneNumber = data["phoneNumber"];
    const ownerEmail = data["email"];


    //Our email
    const emailTB = "info@tbfinancialservice.com";


    //Partner Name Section - Break down the partner information into individual parts - MIGHT CHANGE
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
        partnerZipList.push(zipCode);
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
        cardInfo: {
            ID: cardID
        },
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
        },
        checks: {
            rushProcess: rushProcess,
            tbAddress: useTbAddress
        }
    };


    //Fill out the form, and if it returns a 'success', then call the moveCardToPhase which activates the Make automatioion to move the card to the next phase - WILL CHANGE TO A DIFFERENT PROGRAM
    console.log("Filling out SunBiz form now...");
    if (await fillSunBizForm(completeData) === "success") {
        console.log("Form completed successfully.");
    }
})


app.listen(PORT, () => {
    console.log(`App running on port ${PORT}`);
    //Will finish writing later
});