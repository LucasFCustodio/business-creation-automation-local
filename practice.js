//This file is for practicing to use Puppeteer, so I don't have to practice in the main file

import puppeteer from "puppeteer";
import states from "us-state-converter";

var stateInitials = states.abbr("Illinois");
console.log(stateInitials);

/*const browser = await puppeteer.launch({
        headless: false,
        slowMo: 100
    });

const page = await browser.newPage();

await page.goto('https://the-internet.herokuapp.com/checkboxes')

await page.click('#checkboxes input:nth-of-type(2)');
await page.click('#checkboxes input:nth-of-type(1)');*/