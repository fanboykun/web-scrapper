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
        try {
            await page.waitForSelector('table#table_1');
        } catch(err) {
            return false;
        }

        
        // Extract the desired content
        const content = await page.evaluate(() => {
            const data = new Array
            // This function runs in the context of the browser
            // You can use standard DOM manipulation methods here

            document.querySelectorAll("tr").forEach((element) => {
                const profileLink = element.querySelector('a')?.href ?? null;
                const groupName = element.querySelector('td.column-group_name')?.textContent.trim() ?? null
                const agency = element.querySelector('td.column-company')?.textContent.trim() ?? null
                const debutYear = element.querySelector('td.column-debut')?.textContent.trim() ?? null
                const memberCount = element.querySelector('td.column-members')?.textContent.trim() ?? null

                const item = {
                    profile: profileLink,
                    name: groupName,
                    type: 'girl group',
                    agency: agency,
                    debutYear: debutYear,
                    memberCount: memberCount,
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

if( process.argv.indexOf('-u') > -1 ) {
    url = process.argv[process.argv.indexOf('-u') + 1]
    destination.url = url
}
  
// let el = null
// if( process.argv.indexOf('-e') > -1 ) {
//     el = process.argv[process.argv.indexOf('-e') + 1]
//     destination.element = el
// }
      
// Call the scrapeWebsite function to initiate the scraping process
scrapeWebsite(destination)
.then(async (result) => {
    if(result == false) {
        console.error('failed!')
    }
    const i = await processAgencyData(result)
    if(i) {
        console.log(i)
    }
}).then(() => {
    console.log(`second process begin!`)
});

async function processAgencyData(result) {

    console.log(`result count: ${result.length}`)

    // Filter out data where agency dan group name is null
    const filteredData = result.filter(item => item.agency !== null && item.name !== null);
    console.log(`filtered data  count: ${filteredData.length}`)

    // Group the filtered data by agency
    const groupedData = filteredData.reduce((acc, currentItem) => {
        const { agency } = currentItem;
        if (!acc[agency]) {
            acc[agency] = [];
        }
        acc[agency].push(currentItem);
        return acc;
    }, {});
    
    if(!groupedData) return

    const ag = await insertAgency(groupedData)
    const res = await getAgencies()
    if(res) {
        const conn = db.connect()
        const processedGroup = new Array
        res.map((v, i) => {
            console.log(`mapping through agency: ${v?.name}`)
            if(groupedData[v.name]) {
                const group = groupedData[v.name]
                group.map( async (d) => {
                    console.log(`mapping trough group: ${d?.name}`)
                    if(d.done == true) return
                    const resultId = await insertGroup(conn, d, v)
                    if(resultId) {
                        d.done = true
                        return processedGroup.push(resultId)
                    }
                })
            }
        })
        Promise.all(processedGroup)
        conn.end()
        console.log(`processing agency and group done!`)
        return processedGroup
    }
}

async function insertAgency(data) {
    return new Promise((resolve, reject) => {
        const values = Object.entries(data).map((v, i) => `('${v[0]}')`).join(', ')
        const statement = `INSERT INTO \`agencies\` (\`name\`) VALUES ${values}`
        const connection = db.connect()
        if(!connection) return
        connection.query(statement, (err, result) => {
            if(err) {
                reject(err)
                throw err
            }
            console.log('success inserting batch agency data')
            resolve(true)
        })
        connection.end()
    })
}

async function getAgencies(callback = null) {
    return new Promise((resolve, reject) => {
        const statement = 'SELECT * FROM `agencies`'
        const connection = db.connect()
        if(!connection) return
        connection.query(statement, (err, result) => {
            if(err) {
                reject(err)
                throw err
            } 
            console.log(`retrieved agency data from the database`)
            resolve(result)
        })
        connection.end()
    })
}

async function insertGroup(conn, d, v) {
    return new Promise((resolve, reject) => {
        if(!conn) reject('no conection')
        const statement = `INSERT INTO \`groups\` (\`name\`, \`type\`, \`debutYear\`, \`memberCount\`, \`agency_id\`, \`profile_link\`) VALUES ("${d.name}", '${d.type}', '${d.debutYear}', '${d.memberCount}', '${v.id}', '${d.profile == null ? '' : d.profile}' )`
        conn.query(statement, (err, result) => {
            if(err) {
                reject(err)
                throw err
            } 
            console.log(`inserted group data, id: ${result.insertId}`)
            resolve(result.insertId)
        })
    })
}
