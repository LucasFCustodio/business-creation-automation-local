import express from "express";
import 'dotenv/config';
import dateFormat, { masks } from "dateformat";
import { fillSunBizForm, moveCardToPhase } from "./sunbizBot.js";
import report from "./annual-report.js";
import states from "us-state-converter";

const app = express();
const PORT = 3000;

app.use(express.json({ type: '*/*' }));

app.get("/", (req, res) => {
    res.send("The port is working")
});

app.post("/solicitacao-estadual", async (req, res) => {
    var address = "2335 E Atlantic Blvd #300-20";
    var city = "Pompano Beach";
    var zipCode = "33062";
    var country = "US";
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
        else if (businessState === "Delaware" || businessState === "delaware") {
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


    //Owner Section - Break down the owner information into individual parts - DONE
    const ownerFirstName = data["firstName"];
    const ownerLastName = data["lastName"];
    const ownerSignature = ownerFirstName + " " + ownerLastName;
    const ownerPhoneNumber = data["phoneNumber"];
    const ownerEmail = data["email"];


    //Our email
    const emailTB = "info@tbfinancialservice.com";


    //Physical Partner Name Section - Have a list of partner first names and last names - MIGHT CHANGE
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
        //Physical Partner Name Section
        partnerFirstNameString = data["partnerFirstName"];
        partnerFirstNameList = partnerFirstNameString.split(", ");
        partnerLastNameString = data["partnerLastName"];
        partnerLastNameList = partnerLastNameString.split(", ");
        numberOfPartners = partnerFirstNameList.length;

        console.log("This is the number of partners: " + numberOfPartners);

        //Physical Partner Address Section - Have a list of partner addresses
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
        //Business Partner Name Section - Have a list of businmess partner names
        partnerFirstNameString = data["businessPartnerName"];
        partnerFirstNameList = partnerFirstNameString.split(", ");
        numberOfPartners = partnerFirstNameList.length;

        console.log("This is the number of business partners: " + numberOfPartners);

        //Business Partner Address Section - Have a list of business partner addresses
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

app.post("/annual-report", async (req, res) => {
    const data = req.body;

    //Default TB Address
    var address = "2335 E Atlantic Blvd #300-20";
    var city = "Pompano Beach";
    var zipCode = "33062";
    var country = "US";

    //Business Information
    var businessState = data["state"];
    var abbrevState = states.abbr(businessState);
    var businessName = data["businessName"];
    var useTbAddress = data["tbAddress"];
    var changeAddress = data["changeAddress"];

    //Physical Partner Name Section - Have a list of partner first names and last names - MIGHT CHANGE
    var partnerType = "Individuals (Pessoas físicas)";
    const partnerFirstNameString = data["partnerFirstName"];
    const partnerFirstNameList = partnerFirstNameString.split(", ");
    const partnerLastNameString = data["partnerLastName"];
    const partnerLastNameList = partnerLastNameString.split(", ");
    const numberOfPartners = partnerFirstNameList.length;

    console.log("This is the number of partners: " + numberOfPartners);

    const completeData = {
        business: {
            name: businessName,
            address: address,
            city: city,
            zip: zipCode,
            state: businessState,
            abbrevState: abbrevState,
            country: country
        },
        checks: {
            tbAddress: useTbAddress,
            changeAddress: changeAddress
        },
        partner: {
            type: partnerType,
            numberOfPartners: numberOfPartners,
            firstNameList: partnerFirstNameList,
            lastNameList: partnerLastNameList,
        }
    }

    report(completeData);
})


app.listen(PORT, () => {
    console.log(`App running on port ${PORT}`);
    //Will finish writing later
});