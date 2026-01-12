//This file receives data from the server (index.js), and uses it to fill out the SunBiz form.
import puppeteer from "puppeteer";
import states from "us-state-converter";

export async function fillSunBizForm(data) {
    console.log("Data has been received: " + data);

    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 50
    });
    const page = await browser.newPage();

    if(data.business.type === "LLC") {
        //Navigate page to the URL - https://efile.sunbiz.org/llc_file.html
        await page.goto('https://efile.sunbiz.org/llc_file.html');

        //Check the disclaimer textbox, and click on 'start new filing'
        await page.click('#disclaimer_read');
        await page.click('input[value="Start New Filing"]');

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

        //Take a screenshot of the result, and store it in the
    }

    console.log("The Bot seems to have worked!");
}