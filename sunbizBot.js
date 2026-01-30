//This file receives data from the server (index.js), and uses it to fill out the SunBiz form.
import puppeteer from "puppeteer";
import states from "us-state-converter";
import axios from "axios";
import fs from "fs";
import emailjs from "@emailjs/nodejs";

export async function fillSunBizForm(data) {
    console.log("Data has been received: " + data);

    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 3,
        args: [
            '--disable-features=AutofillAddressEnabled',
            '--disable-offer-store-unmasked-wallet-cards',
            '--disable-autofill-keyboard-accessory-view'
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
            await page.click('input[value="Start New Filing"]')
        ]);

        //Fill in for the date
        await page.type('#eff_date_mm', data.effectiveDate.month);
        await page.type('#eff_date_dd', data.effectiveDate.day);
        await page.type('#eff_date_yyyy', data.effectiveDate.year);

        //Check the cOS amd CC flag
        await page.click('#cos_num_flag');
        await page.click('#cert_num_flag');

        //Fill in LLC name
        await page.type('#corp_name', data.business.name + " LLC");

        //Fill in Principal Place of Business Information
        await page.type('#princ_addr1', data.business.address);
        await page.type('#princ_city', data.business.city);
        var stateInitials = states.abbr(data.business.state);
        await page.type('#princ_st', stateInitials);
        await page.type('#princ_zip', data.business.zip);
        await page.type('#princ_cntry', data.business.country);

        //Mailing Address to be the same as the principal address
        await page.click('#same_addr_flag');

        //Fill in Registed Agent Information
        await page.type('#ra_name_corp_name', 'TB Financial Services LLC');
        await page.type('#ra_addr1', "2335 E Atlantic Blvd #300-20");
        await page.type('#ra_city', 'Pompano Beach');
        await page.type('#ra_zip', '33062');
        await page.type('#ra_signature', 'Brenno Dias');

        //Provisions
        await page.type('#purpose', 'For any and all business proposals');

        //Fill in Correspondence Name and Email Address
        await page.type('#ret_name', data.owner.firstName + " " + data.owner.lastName);
        await page.type('#ret_email_addr', 'info@tbfinancialservice.com');
        await page.type('#email_addr_verify', 'info@tbfinancialservice.com');
        await page.type('#signature', "Brenno Dias")

        //Fill in Partners section for however many partners there are
        const numberOfPartners = data.partner.numberOfPartners;
        for (var i = 0; i < numberOfPartners; i++) {
            //Fill out name information
            await page.type(`#off${i + 1}_name_title`, 'MGRM'); //Title
            await page.type(`#off${i + 1}_name_last_name`, data.partner.lastNameList[i]); //Last name for this partner
            await page.type(`#off${i + 1}_name_first_name`, data.partner.firstNameList[i]);
            await page.type(`#off${i + 1}_name_m_name`, data.partner.initialList[i]);

            //Fill out address information
            await page.type(`#off${i + 1}_name_addr1`, data.partner.addressList[i]);
            await page.type(`#off${i + 1}_name_city`, data.partner.cityList[i]);
            stateInitials = states.abbr(data.partner.stateList[i]);
            await page.type(`#off${i + 1}_name_st`, stateInitials);
            await page.type(`#off${i + 1}_name_zip`, data.partner.zipList[i]);
            await page.type(`#off${i + 1}_name_cntry`, data.partner.country);
        }

        //Wen done filling all the information, click on continue to go to the next page
        //Submit button for the form page still - #1
        await Promise.all([
            //Bot must wait until the network is idle
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            await page.click('input[name="submit"]')
        ]);

        //Click continue again to get out of the review page
        //Submit button for the Filing Information Page - #2
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            await page.click('input[name="submit"]')
        ]);

        //Popup handling happens automatically with the 'dialog' event listener defined earlier
        await page.keyboard.press('Enter');

        //Take screenshot of the Online Filing Information
        const screenshotPath = 'screenshots/result.png';
        await page.screenshot({ path: screenshotPath });

        // --- CORRECTED EMAILJS LOGIC ---
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

        //Click on Credit Card Payment Button
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            await page.click('input[value="Credit Card Payment"]')
        ]);

        await Promise.all([
            await page.type('#CustomerInfo_FirstName', data.owner.firstName)
        ]);

        //Customer Information Section
        await page.type('#CustomerInfo_LastName', data.owner.lastName);
        await page.type('#CustomerInfo_Address1', data.business.address);
        await page.type('#CustomerInfo_City', data.business.city);
        await page.select('#CustomerInfo_State', 'FL');
        await page.type('#CustomerInfo_Zip', data.business.zip);
        await page.type('#Phone', data.owner.phoneNumber);
        await page.type('#Email', data.owner.email);
        await page.click('#bntNextCustomerInfo');

        //Credit card filling section
        console.log("It left the Promise.all!");
        await page.type('#CCCardNumber', process.env.CREDIT_CARD_NUMBER);
        await page.type('#CCCardNumber', process.env.CREDIT_CARD_NUMBER);
        await page.select('#CCExpirationMonth', process.env.CREDIT_CARD_EXPIRATION_MONTH);
        await page.select('#CCExpirationYear', process.env.CREDIT_CARD_EXPIRATION_YEAR);
        await page.type('#CCCardCVV', process.env.CREDIT_CARD_CVV);
        await page.type('#CCNameOnCard', process.env.CREDIT_CARD_NAME);

        //await browser.close();

        console.log("The Bot worked - inside if!");

        return "success";
    }

    console.log("The Bot worked!");
}

export async function moveCardToPhase(cardID) {
    axios.get('https://hook.us2.make.com/9vre3y1ew9bk44wsfudg35g9xo3ena6a', {
            headers: {
                'Content-Type': 'application/json'
            },
            params: {
                'cardID': cardID
            }
        })
}