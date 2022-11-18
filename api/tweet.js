import * as HttpsProxyAgent from 'https-proxy-agent' 
const needle = require('needle');
// const tunnel = require('tunnel');
// const agent = tunnel.httpOverHttp({
//   proxy: { host: 'proxy.luxbourse.local:8080' }
// });
const proxy = process.env.APP_HTTP_PROXY || '';

// const { HttpsProxyAgent } = require('hpagent');
// const agent = new HttpsProxyAgent({
//     keepAlive: true,
//     keepAliveMsecs: 1000,
//     maxSockets: 256,
//     maxFreeSockets: 256,
//     scheduling: 'lifo',
//     //proxy: 'http://proxy.luxbourse.local:8080'
//     proxy: 'http://proxy:8080'
//   });

// process.env.DEBUG = true;

const token = process.env.TWITTER_TOKEN;
const endpointUrl = "https://api.twitter.com/2/tweets/search/recent";

async function getRequest() {

    // Edit query parameters below
    // specify a search query, and any additional fields that are required
    // by default, only the Tweet ID and text fields are returned
    const params = {
        //'query': 'from:TERNancyMetzLux InfoTrafic',
        //'tweet.fields': ['author_id', 'source', 'id', 'text']
        'query': 'from:twitterdev -is:retweet',
        'tweet.fields': 'author_id'
    }

    const options = {
        headers: {
            "User-Agent": "v2RecentSearchJS",
            "authorization": `Bearer ${token}`
        }
    }

    if (proxy){
        options.agent = new HttpsProxyAgent.HttpsProxyAgent(proxy);
    }

    const res = await needle('get', endpointUrl, params, options)
    if (res.body) {
        return res.body;
    } else {
        throw new Error('Unsuccessful request');
    }
}

export default getRequest;