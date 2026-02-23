//This file receives data from the server (index.js), and uses it to fill out the SunBiz form.
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Tell puppeteer to use the stealth plugin with default settings
puppeteer.use(StealthPlugin());

// Configure the recaptcha plugin
puppeteer.use(StealthPlugin());

import states from "us-state-converter";
import axios from "axios";
import emailjs from "@emailjs/nodejs";

async function solveRecaptchaManual(pageUrl) {
    console.log("sending a 2Captcha request to solve the captcha");

    const createResponse = await axios.post('https://api.2captcha.com/createTask', {
        "clientKey": process.env.TWOCAPTCHA_API_KEY,
        "task": {
            "type": "RecaptchaV2EnterpriseTaskProxyless",
            "websiteURL": pageUrl,
            "websiteKey": "6Le9aJcoAAAAAPcbixT6fXd-GwK9ZVM1I5Q5xGpk",
            "isInvisible": true
        }
    },
    {
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    console.log("createTask response:", createResponse.data);

    const taskId = createResponse.data.taskId;

    if(!taskId) {
        throw new Error(`2Captcha createTask failed: ${JSON.stringify(createResponse.data)}`);
    }

    console.log(`Task created with ID: ${taskId}. Polling for result...`);

    for (let attempt = 0; attempt < 24; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); //Wait 5 seconds before moving on

        const resultResponse = await axios.post('https://api.2captcha.com/getTaskResult', {
            "clientKey": process.env.TWOCAPTCHA_API_KEY,
            "taskId": taskId
        },
        {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Poll attempt ${attempt + 1}:`, resultResponse.data);

        const { status, solution, errorId, errorCode, cost, errorDescription } = resultResponse.data;

        if(errorId !== 0) {
            throw new Error(`Error ${errorCode} occurred, with the following description: ${errorDescription}`);
        }

        if(status == "ready") {
            console.log(`Captcha solved with the cost of ${cost}! Token received.`);
            return solution.gRecaptchaResponse;
        }
    }
    //If the status is not changed, and/or error is not received withing 2 minutes, throw a new Error
    throw new Error("2Captcha timed out: captcha was not solved within 2 minutes.");
}

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
            slowMo: 5,
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
                await page.type('#ra_signature', 'TB FINANCIAL SERVICES');
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
                        await page.type(`#off${i + 2}_name_addr1`, data.partner.addressNumberList[i] + " " + data.partner.streetNameList[i]);
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

            //Take screenshot of the Online Filing Information
            const screenshotPath = 'screenshots/result.png';
            await page.screenshot({ path: screenshotPath });

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

            //Click on Credit Card Payment Button
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                page.click('input[value="Credit Card Payment"]')
            ]);

            await Promise.all([
                page.type('#CustomerInfo_FirstName', "Brenno")
            ]);

            //Customer Information Section
            await page.type('#CustomerInfo_LastName', "Dias");
            await page.type('#CustomerInfo_Address1', "2335 E Atlantic Blvd");
            await page.type('#CustomerInfo_City', "Pompano Beach");
            await page.select('#CustomerInfo_State', 'FL');
            await page.type('#CustomerInfo_Zip', "33062");
            await page.type('#Phone', "(954) 868-3825");
            await page.type('#Email', "info@tbfinancialservice.com");
            await page.click('#bntNextCustomerInfo');

            // --- Credit card filling section (with human-like delays) ---
            await page.waitForSelector('#CCCardNumber', { visible: true });
            
            // Wait 1 second before typing card number
            await new Promise(resolve => setTimeout(resolve, 1000));
            await page.type('#CCCardNumber', process.env.CREDIT_CARD_NUMBER, { delay: 150 });
            
            // Wait a moment before selecting expiration
            await new Promise(resolve => setTimeout(resolve, 800));
            await page.select('#CCExpirationMonth', process.env.CREDIT_CARD_EXPIRATION_MONTH);
            await new Promise(resolve => setTimeout(resolve, 500));
            await page.select('#CCExpirationYear', process.env.CREDIT_CARD_EXPIRATION_YEAR);
            
            // Wait before typing CVV
            await new Promise(resolve => setTimeout(resolve, 1200));
            await page.type('#CCCardCVV', process.env.CREDIT_CARD_CVV, { delay: 200});
            
            // Wait before typing Name
            await new Promise(resolve => setTimeout(resolve, 900));
            await page.type('#CCNameOnCard', process.env.CREDIT_CARD_NAME, { delay: 150 });

            // Wait 2 seconds before clicking the first "Next" button
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Click the next button to validate card (Wait for submit button to appear, NOT navigation)
            await page.click("#bntNextPaymentInfo");
            await page.waitForSelector('#submitPayment', { visible: true });

            const captchaInfo = await page.evaluate(() => {
                const results = {};

                // 1. Check for any element with data-sitekey
                const sitekeyEl = document.querySelector('[data-sitekey]');
                results.domSitekey = sitekeyEl ? sitekeyEl.getAttribute('data-sitekey') : null;

                // 2. Scan ALL script tags (src and inline) for any sitekey patterns
                const allScripts = Array.from(document.querySelectorAll('script'));
                results.scriptSrcs = allScripts
                    .filter(s => s.src)
                    .map(s => s.src)
                    .filter(src => src.includes('recaptcha') || src.includes('google'));

                // 3. Look for sitekey in inline script content
                const inlineMatches = allScripts
                    .filter(s => !s.src && s.textContent.includes('recaptcha'))
                    .map(s => s.textContent.substring(0, 500)); // First 500 chars of each match
                results.inlineScripts = inlineMatches;

                // 4. Check if grecaptcha object exists and what's on it
                results.grecaptchaExists = typeof grecaptcha !== 'undefined';
                results.grecaptchaEnterpriseExists = typeof grecaptcha !== 'undefined' 
                    && typeof grecaptcha.enterprise !== 'undefined';

                // 5. Look for any hidden inputs related to captcha
                const hiddenInputs = Array.from(document.querySelectorAll('input[type="hidden"]'))
                    .map(i => ({ id: i.id, name: i.name, value: i.value.substring(0, 100) }));
                results.hiddenInputs = hiddenInputs;

                return results;
            });

            console.log("Full captcha scan:", JSON.stringify(captchaInfo, null, 2));


            // --- MANUAL RECAPTCHA BYPASS ---
            // Grab the current dynamic URL of the payment page
            const currentUrl = page.url(); 
            
            // Call the custom 2Captcha function
            const token = await solveRecaptchaManual(currentUrl);

            console.log("Injecting token directly into the SunBiz DOM...");
            await page.evaluate((solvedToken) => {
                // 1. Inject into the standard hidden reCAPTCHA text area
                let standardInput = document.getElementById('g-recaptcha-response');
                if (standardInput) {
                    standardInput.innerHTML = solvedToken;
                }
                
                // 2. Inject into the specific Enterprise custom input you found in the DOM
                let customInput = document.getElementById('recaptcha-token');
                if (customInput) {
                    customInput.value = solvedToken;
                }
            }, token);
            // --------------------------------

            // Wait 2 seconds for the DOM to register the injected values
            await new Promise(resolve => setTimeout(resolve, 2000));

            //Click the Submit Payment Button
            console.log("Submitting final payment...");
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }), // Added timeout just in case it's slow
                //page.click("#submitPayment")
            ]);
            console.log("Payment submitted and page loaded.");

            const urlCheck = page.url();

            if (urlCheck.includes("dos.fl.gov/sunbiz/")) {
            // If we landed on the home page, something went wrong. 
            // This 'throw' stops the code immediately and sends it to your catch block.
            throw new Error("Payment rejected: SunBiz redirected back to the home page.");
    
            } else if (urlCheck.includes("Checkout/Recipt")) {
                console.log("Payment successful! Receipt page loaded.");
            } else {
                throw new Error(`Unexpected page loaded: ${urlCheck}`);
            }

            console.log("The bot filled everything out. Returning success...");
            //return "success";
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

    } finally {
        // 3. This block ALWAYS runs, error or success
        if (browser) {
            console.log("Closing browser...");
            //await browser.close();
        }
    }
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