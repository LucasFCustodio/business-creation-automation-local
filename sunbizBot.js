//This file receives data from the server (index.js), and uses it to fill out the SunBiz form.
import puppeteer from "puppeteer";

// Tell puppeteer to use the stealth plugin with default settings
//puppeteer.use(StealthPlugin());

import emailjs from "@emailjs/nodejs";
import 'dotenv/config';

let browser = null;

export async function fillSunBizForm(data) {
    try {
        console.log("state is: " + data.business.state);

        //Logic for if the client wants to open a business in DELAWARE
        if (data.business.state === "DE") {
            try {
                const templateParams = {
                    title: data.business.name + " LLC",
                    name: "SunBiz Bot",
                    message: `
                    New filing submitted for Delaware. Please follow up accordingly.
                    Data: ${JSON.stringify(data, null, 2)}
                    \n\nThank you for your cooperation.
                    `,
                    email: "info@solidpathconsulting.com",
                };

                //Getting ready to send email for the rush process
                await emailjs.send(
                    process.env.EMAILJS_SERVICE_ID,
                    process.env.EMAILJS_TEMPLATE_ID, //Same template, but will send it to the following email - threekfastcsvc@aol.com
                    templateParams,
                    {
                        publicKey: process.env.EMAILJS_PUBLIC_KEY,
                        privateKey: process.env.EMAILJS_PRIVATE_KEY,
                    }
                );
                console.log("Delaware email sent successfully!");
            } catch (emailError) {
                console.error("Failed to send email:", emailError);
                // We catch the error so the bot doesn't crash; it will still finish the process below.
            }
            return "Delaware";
        }

        if (data.checks.rushProcess === "Yes (+$300)") {
            try {
                const templateParams = {
                    title: data.business.name + " LLC",
                    name: "SunBiz Bot",
                    message: `
                    New filing submitted with a Rush Process Request. Please follow up accordingly.
                    Data: ${JSON.stringify(data, null, 2)}
                    \n\nThank you for your cooperation.
                    `,
                    email: "threekfastcsvc@aol.com",
                };

                //Getting ready to send email for the rush process
                await emailjs.send(
                    process.env.EMAILJS_SERVICE_ID,
                    process.env.EMAILJS_TEMPLATE_ID, //Same template, but will send it to the following email - threekfastcsvc@aol.com
                    templateParams,
                    {
                        publicKey: process.env.EMAILJS_PUBLIC_KEY,
                        privateKey: process.env.EMAILJS_PRIVATE_KEY,
                    }
                );
                console.log("Rush process email sent successfully!");
            } catch (emailError) {
                console.error("Failed to send email:", emailError);
                // We catch the error so the bot doesn't crash; it will still finish the process below.
            }
            return "rush";
        }

            browser = await puppeteer.launch({
            headless: false,
            slowMo: 30,
            args: [
                '--disable-features=AutofillAddressEnabled',
                '--disable-offer-store-unmasked-wallet-cards',
                '--disable-autofill-keyboard-accessory-view',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        });
        const page = await browser.newPage();

        page.on('dialog', async dialog => {
            console.log("--------------------------------");
            console.log(`DIALOG DETECTED: ${dialog.message()}`);
            console.log("--------------------------------");
            await dialog.accept(); // Press "Enter" / Click "OK"
        });

        if(data.business.type === "LLC") {
            await page.setViewport({ width: 1920, height: 1080 });

            //Navigate page to the URL - https://efile.sunbiz.org/llc_file.html
            await page.goto('https://efile.sunbiz.org/llc_file.html');

            //Check the disclaimer textbox, and click on 'start new filing'
            await page.click('#disclaimer_read');
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                page.click('input[value="Start New Filing"]')
            ]);

            //Fill in for the date
            await page.type('#eff_date_mm', data.effectiveDate.month);
            await page.type('#eff_date_dd', data.effectiveDate.day);
            await page.type('#eff_date_yyyy', data.effectiveDate.year);

            //Check the cOS amd CC flag
            await page.click('#cos_num_flag');
            await page.click('#cert_num_flag');

            //Fill in LLC name
            if(data.business.name.includes("LLC") || data.business.name.includes("llc") || data.business.name.includes("L.L.C") || data.business.name.includes("l.l.c")) {
                await page.type('#corp_name', data.business.name);
            }
            else {
                await page.type('#corp_name', data.business.name + " LLC");
            }

            //Fill in Principal Place of Business Information
            await page.type('#princ_addr1', data.business.address);
            await page.type('#princ_city', data.business.city);
            await page.type('#princ_st', data.business.state);
            await page.type('#princ_zip', data.business.zip);
            await page.type('#princ_cntry', data.business.country);


            //Mailing Address to be the same as the principal address
            await page.click('#same_addr_flag');

            //Fill in Registed Agent Information
            if(data.checks.tbAddress === "No" || data.checks.tbAddress === "no") { //If user wants their own address, then Brenno is the RA
                await page.type('#ra_name_corp_name', 'TB Financial Services LLC');
                await page.type('#ra_addr1', "2335 E Atlantic Blvd #300-20");
                await page.type('#ra_city', 'Pompano Beach');
                await page.type('#ra_zip', '33062');
                await page.type('#ra_signature', 'Brenno Dias');
            }
            else { //If the user wants TB's address, then they are the RA
                await page.type('#ra_name_last_name', data.owner.lastName);
                await page.type('#ra_name_first_name', data.owner.firstName);
                await page.type('#ra_addr1', "2335 E Atlantic Blvd #300-20");
                await page.type('#ra_city', 'Pompano Beach');
                await page.type('#ra_zip', '33062');
                await page.type('#ra_signature', `${data.owner.firstName} ${data.owner.lastName}`); //Owner's name as signature
            }

            //Provisions
            await page.type('#purpose', 'For any and all business proposals');

            //Fill in Correspondence Name and Email Address
            await page.type('#ret_name', data.owner.firstName + " " + data.owner.lastName);
            await page.type('#ret_email_addr', 'info@tbfinancialservice.com');
            await page.type('#email_addr_verify', 'info@tbfinancialservice.com');
            await page.type('#signature', data.owner.firstName + " " + data.owner.lastName);

            //Fill in owner's information as someone who is authorized to manage the LLC
            //Fill out name information
            await page.type(`#off1_name_title`, 'MGRM'); //Title
            await page.type(`#off1_name_last_name`, data.owner.lastName); //Last name for this partner
            await page.type(`#off1_name_first_name`, data.owner.firstName);

            //Fill out address information
            await page.type(`#off1_name_addr1`, data.business.address);
            await page.type(`#off1_name_city`, data.business.city);
            await page.type(`#off1_name_st`, data.business.state);
            await page.type(`#off1_name_zip`, data.business.zip);
            await page.type(`#off1_name_cntry`, data.business.country);

            //Fill in Partners section for however many partners there are
            const partnerType = data.partner.type
            const numberOfPartners = data.partner.numberOfPartners;
            if(partnerType == "Individuals (Pessoas físicas)") {
                if(data.partner.lastNameList[0] == "" || data.partner.lastNameList == null){
                    console.log("No partners");
                }
                else {
                    for (var i = 0; i < numberOfPartners; i++) {
                        //Fill out name information
                        await page.type(`#off${i + 2}_name_title`, 'MGRM'); //Title
                        await page.type(`#off${i + 2}_name_last_name`, data.partner.lastNameList[i]); //Last name for this partner
                        await page.type(`#off${i + 2}_name_first_name`, data.partner.firstNameList[i]);

                        //Fill out address information
                        await page.type(`#off${i + 2}_name_addr1`, data.partner.addressNumberList[i] + " " + data.partner.streetNameList[i]);
                        await page.type(`#off${i + 2}_name_city`, data.partner.cityList[i]);
                        await page.type(`#off${i + 2}_name_st`, data.partner.stateList[i]);
                        console.log(`State for Partner ${i}: ${data.partner.stateList[i]}`);
                        await page.type(`#off${i + 2}_name_zip`, data.partner.zipCodeList[i]);
                        await page.type(`#off${i + 2}_name_cntry`, data.partner.country[i]);
                    }
                }
            }
            else if (partnerType == "Companies (Empresas)") {
                if(data.partner.firstNameList[0] == "" || data.partner.firstNameList == null) {
                    console.log("No business partners");
                }
                else {
                    for (var i = 0; i < numberOfPartners; i++) {
                        //Fill out name information
                        await page.type(`#off${i + 2}_name_title`, 'MGRM'); //Title
                        await page.type(`#off${i + 2}_name_corp_name`, data.partner.firstNameList[i]);

                        //Fill out address information
                        await page.type(`#off${i + 2}_name_addr1`, data.partner.addressNumberList[i] + " " + data.partner.streetNameList[i], { delay: 161 });
                        await page.type(`#off${i + 2}_name_city`, data.partner.cityList[i]);
                        await page.type(`#off${i + 2}_name_st`, data.partner.stateList[i]);
                        console.log(`State for Partner ${i}: ${data.partner.stateList[i]}`);
                        await page.type(`#off${i + 2}_name_zip`, data.partner.zipCodeList[i]);
                        await page.type(`#off${i + 2}_name_cntry`, data.partner.country[i]);
                    }
                }
            }
            else {
                console.log("no partners");
            }



            //---DONE FILLING THE FIRST PAGE OF THE DOCUMENT---



            //When done filling all the information, click on continue to go to the next page
            //Submit button for the form page still - #1
            await Promise.all([
                //Bot must wait until the network is idle
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                page.click('input[name="submit"]')
            ]);

            //Click continue again to get out of the review page
            //Submit button for the Filing Information Page - #2
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                page.click('input[name="submit"]')
            ]);

            //Popup handling happens automatically with the 'dialog' event listener defined earlier
            await page.keyboard.press('Enter');

            // --- SEND EMAIL WITH THE TRACKING NUMBER ---
            try {
                console.log("Retireving Tracking #");

                // Wait for the tracking number element to appear
                await page.waitForSelector('td.efiledata');

                // Extract the text
                const trackingNumber = await page.evaluate(() => {
                    // 1. Find all 'td' elements with the class 'efiledata'
                    const dataCells = Array.from(document.querySelectorAll('td.efiledata'));
    
                    // 2. Filter to find the one that looks like a number (or just grab the first valid one)
                    // Based on your image, it looks like the tracking number is likely the first or most prominent 'efiledata'
                    // But to be safe, we can look for the label:
    
                    const label = Array.from(document.querySelectorAll('td.descript'))
                        .find(td => td.textContent.includes('Document Tracking #:'));
        
                    if (label && label.nextElementSibling) {
                        return label.nextElementSibling.innerText.trim();
                    }
    
                    return "NOT_FOUND";
                }); 

                const templateParams = {
                    title: data.business.name + " LLC",
                    name: "SunBiz Bot",
                    message: `New filing submitted. Tracking number captured: ${trackingNumber}`,
                    email: "info@tbfinancialservice.com",
                };

                console.log("Sending email with Tracking #:", trackingNumber);

                await emailjs.send(
                    process.env.EMAILJS_SERVICE_ID,
                    process.env.EMAILJS_TEMPLATE_ID,
                    templateParams,
                    {
                        publicKey: process.env.EMAILJS_PUBLIC_KEY,
                        privateKey: process.env.EMAILJS_PRIVATE_KEY,
                    }
                );
                console.log("Email sent successfully!");
            } catch (emailError) {
                console.error("Failed to send email:", emailError);
                // We catch the error so the bot doesn't crash; it will still finish the process below.
            }
            // --- NEW EMAILJS LOGIC ENDS HERE ---

            //Click continue to get out of the Online Filing Information page - #3
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                await page.click('input[name="submit"]')
            ]);

            console.log("Ready to submit final payment...");
            
        }
    } catch (error) {
        const filingError = error.message;
        console.error("Main Process Error:", filingError);

        // 2. Wrap the fail-safe email in its own try/catch
        try {
            const templateParams = {
                title: data.business.name + " LLC",
                name: "SunBiz Bot",
                message: `
                State filing failed: ${filingError}.
                Card ID: ${data.cardInfo.ID}
                `,
                email: "info@tbfinancialservice.com",
            };

            await emailjs.send(
                process.env.EMAILJS_SERVICE_ID,
                process.env.EMAILJS_TEMPLATE_ID,
                templateParams,
                {
                    publicKey: process.env.EMAILJS_PUBLIC_KEY,
                    privateKey: process.env.EMAILJS_PRIVATE_KEY,
                }
            );
            console.log("Fail-safe email sent.");
        } catch (emailError) {
            console.error("CRITICAL: Could not send fail-safe email.", emailError);
        }
        
        // Return something so index.js knows it failed
        return "failed"; 
    }
}