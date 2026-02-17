import puppeteer from "puppeteer";
import emailjs from "@emailjs/nodejs";

let browser = null;
let check = false;

export async function report(data) {
    try{
        console.log("This is the data: ", data);
        const businessName = data.business.name;

        if (data.business.state == "Delaware" || data.business.state == "Other") {
            console.log("Email is being sent to the appropriate party");
            return;
        }
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 70,
            args: [
                '--disable-features=AutofillAddressEnabled',
                '--disable-offer-store-unmasked-wallet-cards',
                '--disable-autofill-keyboard-accessory-view'
            ]
        });

        //Open a new page
        const page = await browser.newPage();
        //Go to the page to search for a corporation by name
        await page.goto("https://search.sunbiz.org/Inquiry/CorporationSearch/ByName");
        await page.type("#SearchTerm", businessName);
        await page.click('input[value="Search Now"]');

        //Make sure the page is done loading, and one of its elements is loaded as a safety requirement
        page.waitForNavigation({ waitUntil: 'networkidle2' }),

        //Process to find the right business and gets its document id
        await page.locator('a ::-p-text(TB FINANCIAL SERVICES LLC)').click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        //The following variable is to grab the document number
        const documentNumber = await page.evaluate(() => {
            const xpath = "//label[contains(text(), 'Document Number')]/following-sibling::span[1]";
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            return result.singleNodeValue ? result.singleNodeValue.textContent.trim() : null;
        });

        console.log(documentNumber);


        //Now that it has the documentNumber, go to the page to file the annual report
        await Promise.all([
            await page.goto("https://services.sunbiz.org/Filings/AnnualReport/FilingStart"),
            await page.type("#DocumentId", documentNumber)
        ]);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            await page.click('input[value="Submit"]')
        ]);




        //---BOT IS IN THE CORRECT PAGE. TIME TO CHECK FOR ANY INFORMATION THAT SHOULD CHANGE//
        //Check for if they want to use the TB business address
        if (data.checks.tbAddress == "Yes(+$250/Year)") {
            //PRINCIPAL ADDRESS
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                await page.click('input[value="Edit Principal Address"]')
            ]);
            await page.select("#Address_Country", data.business.country);
            await page.type("#Address_Address1", data.business.address);
            await page.type("#Address_City", data.business.city);
            console.log("This is the abbrev state value:", data.business.abbrevState);
            await page.select("#Address_State", data.business.abbrevState);
            await page.type("#Address_Zip", data.business.zip);

            await page.waitForSelector('#submit'); //Change this button
            console.log("Principal Address button found. Act as if I just hit the submit button");

            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                await page.goBack() //Once the program works, remove this, and the actual submit button will be pressed
            ]);


            //MALING ADDRESS
            await Promise.all([
                page.waitForNavigation({ waitUntil: "networkidle2" }),
                await page.click('input[value="Edit Mailing Address"]')
            ]);
            await page.click("#AddressSameprincipaladdress");

            //THE PROGRAMMING LINES HERE
            await page.waitForSelector('input[value="Save Mailing Address"]'); //Change this button
            console.log("Mailing Address button found. Act as if I just hit the submit button");
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                await page.goBack() //Once the program works, remove this, and the actual submit button will be pressed
            ]);
            //WILL BE CHANGED


            //DELETING PARTNERS
            try {
                while (true) {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle2' }),
                        await page.click('value="Edit or Delete Manager"')

                    ]);
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle2' }),
                        await page.click(".red-link")
                    ]);
                }
            } catch(error) {
                console.log("Keep going!");
            }

            //ADDING NEW PARTNERS
            if (data.partner.numberOfPartners > 0)
            await Promise.all([
                page.waitForNavigation({ waitUntil: "networkidle2" }),
                await page.click('input[value="Add New Manager/Authorized Member/Authorized Representative?"]')
            ]);

        }




    } catch (error) {
        console.error("an error occured: ", error);
    }
}

export default report;