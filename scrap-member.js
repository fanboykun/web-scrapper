const puppeteer = require('puppeteer');
const db = require('./db');

async function scrapeMember(dest, browserInstance = null, shouldCloseBrowser = true) {
    try {
        // Launch a headless browser
        let browser = null
        if(browserInstance == null) {
            browser = await puppeteer.launch();
        } else {
            browser = browserInstance
        }

        const page = await browser.newPage();

        // Navigate to the website
        await page.goto(dest.url, { waitUntil: 'domcontentloaded' });
        
        // Wait for the content to load
        try {
            await page.waitForSelector('table#table_1', { timeout: 5000 });
        } catch {
            const item = {
                stageName: null,
                realName: null,
                birthYear: null,
                country: null,
            }
            return new Array(item)
        }

        // Extract the desired content
        const content = await page.evaluate(() => {
            // initialize data holder
            const data = new Array

            // This function runs in the context of the browser
            // You can use standard DOM manipulation methods here
            document.querySelector('table#table_1').querySelectorAll("tr").forEach((element) => {
                const stageName = element.querySelector('td.column-stage_name')?.textContent.trim() ?? null;
                const realName = element.querySelector('td.column-full_name')?.textContent.trim() ?? null
                const birthYear = element.querySelector('td.column-dob')?.textContent.trim() ?? null
                const country = element.querySelector('td.column-country')?.textContent.trim() ?? null

                if(stageName == null || realName == null) return

                const item = {
                    stageName: stageName,
                    realName: realName,
                    birthYear: birthYear,
                    country: country,
                }
                
                data.push(item)
            })
            return data
        });
        // Close the browser
        if(shouldCloseBrowser) {
            await browser.close();
        }

        return content

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await page.close()
    }
}

async function getGroups() {
    return new Promise((resolve, reject) => {
        const statement = 'SELECT * FROM `groups` where `id` > 61'
        const connection = db.connect()
        if(!connection) return
        connection.query(statement, (err, result) => {
            if(err) {
                reject(err)
                throw err
            } 
            resolve(result)
        })
        connection.end()
    })
}

async function insertMember(data) {
    return new Promise((resolve, reject) => {
        const statement = 'INSERT INTO `members` (`stageName`, `realName`, `birthYear`, `country`, `group_id`) VALUES ?'
        const connection = db.connect()
        if(!connection) return
        connection.query(statement, [data.map(item => [item.stageName, item.realName, item.birthYear, item.country, item.group_id] )], (err, result) => {
            if(err) {
                reject(err)
                throw err
            }
            resolve(result)
        })
        connection.end()
    })
}

// console.log('okay')
getGroups().then( async (groups) => {
    console.log(`groups data fetched, total data : ${groups.length}`)
    
    const filtered = groups.filter((group) => group.profile_link != 'null')
    console.log(`done filtering, total filtered data : ${filtered.length}`)
    const browser = await puppeteer.launch();
    const members = new Array

    try {
        let isFetching = true
        const bacthNum = 5
        const bacth = {
            start: 0,
            end: bacthNum
        }
        let i = 0
        console.log(`batch quota : ${bacthNum}`)
        console.log(`batch start : ${bacth.start}, batch end : ${bacth.end}`)

        while ( i < bacth.end && isFetching && i < filtered.length ) {
            const group = filtered[i]
            console.log(`looping through data number: ${i + 1}, group : ${group.name}, id: ${group.id}`)
            const result = await scrapeMember( { url: group.profile_link } )
            result.map((member) => {
                member.group_id = group.id
                members.push(member)
            })
            console.log(`Done getting members data for group: ${group.name}`)

            // recalculate bacth, to determine should the data saved to the database then continue scrapping
            if(i == bacth.end - 1) {
                bacth.start = bacth.end
                bacth.end = bacth.end + bacthNum
                console.log(`new batch start : ${bacth.start}, new batch end : ${bacth.end}`)
                const insertedMember = await insertMember(members)
                if(!insertedMember) {
                    isFetching = false
                }else {
                    console.log(`done inserting member data at current bacth!`)
                    members.splice(0, members.length)
                }
            }
            i++

        }
        
    } catch(err) {
        throw(err)
    } finally {
        browser.close()
        console.log(members)
        console.log(`bacth quota exceed!`)
        return
    }

})
