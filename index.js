const axios = require('axios');
const cheerio = require('cheerio');
const db = require('./db')

/**
 * @typedef Group
 * @property {string} name
 * @property {string?} type
 * @property {string?} debutYear
 * @property {number?} memberCount
 * @property {Member[]} members
 */

/** 
 * @typedef Member
 * @property {string} stageName
 * @property {string?} realName
 * @property {string?} birthYear
 * @property {string?} country
 */

/**
 * @readonly
 * @enum {string}
 */
export const GroupType = {
  GIRL_GROUP: 'girl group',
  BOY_GROUP: 'boy group',
}

/** @type Group */
const group = new Array


function extractData(html, el = null) {
  const $ = cheerio.load(html);

  let targetEl = null

  if(el != null) {
    targetEl = $(el)
  }

  if(targetEl == null) throw('no selector!')

  const res = new Array
  for (let i = 0; i < targetEl.length; i++) {
    res.push($(targetEl[i]).prop('innerHTML'))
  }
  return JSON.stringify(res)
}


async function fetchHTML(url) {
  const { data } = await axios.get(url);
  return data;
}

async function crawl(url) {
  if( process.argv.indexOf('-u') > -1 ) {
    url = process.argv[process.argv.indexOf('-u') + 1]
  }
  let el = null
  if( process.argv.indexOf('-e') > -1 ) {
    el = process.argv[process.argv.indexOf('-e') + 1]
  }

 try {
  const html = await fetchHTML(url);
  const data = extractData(html, el);

  console.log(data);

 } catch(err) {
  console.error(err)
 }

}

crawl("https://dbkpop.com/db/k-pop-girlgroups/");

