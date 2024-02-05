const puppeteer = require('puppeteer');
const db = require('./db');

async function scrapeWebsite(dest) {
    try {
        // Launch a headless browser
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Navigate to the website
        await page.goto(dest.url);

        // Wait for the content to load
        // await page.waitForSelector(dest.element);
        await page.waitForSelector('table#table_1');

        
        // Extract the desired content
        const content = await page.evaluate(() => {
            const data = new Array
            // This function runs in the context of the browser
            // You can use standard DOM manipulation methods here

            // const tdElement = document.querySelectorAll('td.column-company');
            // return Array.from(tdElement).map(td => td.textContent.trim());

            // document.querySelectorAll("tr[id*='table_6_row_*']").forEach((element) => {
            document.querySelectorAll("tr").forEach((element) => {
                const profileLink = element.querySelector('a.column-group_name')?.href ?? null;
                const groupName = element.querySelector('td.column-group_name')?.textContent.trim() ?? null
                const agency = element.querySelector('td.column-company')?.textContent.trim() ?? null
                const debutYear = element.querySelector('td.column-debut')?.textContent.trim() ?? null
                const item = {
                    profile: profileLink,
                    name: groupName,
                    type: 'girl group',
                    agency: agency,
                    debutYear: debutYear,
                    memberCount: 0,
                }
                data.push(item)
            })
            return data
        });
        // Close the browser
        await browser.close();

        return content

    } catch (error) {
        console.error('Error:', error);
    }
}

const destination = {
    url: 'https://dbkpop.com/db/k-pop-girlgroups',
    element: 'td.column-group_name',
}

// Call the scrapeWebsite function to initiate the scraping process
if( process.argv.indexOf('-u') > -1 ) {
    url = process.argv[process.argv.indexOf('-u') + 1]
    destination.url = url
  }
// let el = null
// if( process.argv.indexOf('-e') > -1 ) {
//     el = process.argv[process.argv.indexOf('-e') + 1]
//     destination.element = el
// }

scrapeWebsite(destination).then((data) => {
    // console.log(data)
    // return
    const statement = 'INSERT INTO `groups` (`name`, `type`, `debutYear`, `memberCount`) VALUES ?'
    const connection = db.connect()
    if(!connection) return
    connection.query(statement, [data.map((item) => [item.name, item.type, item.debutYear, item.memberCount])], (err, result) => {
        if(err) throw err
        console.log(result)
    })
    connection.end()
});
