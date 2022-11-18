import express from 'express'
//var session = require('express-session')
import session from 'express-session'
import { PrismaClient } from '@prisma/client'
import { TweetBookmarksTimelineV2Paginator, TwitterApi, TwitterApiV2Settings } from 'twitter-api-v2';
import * as HttpsProxyAgent from 'https-proxy-agent' 
//import getRequest from './tweet.js'
import cache from './nodeCache'

import * as dotenv from 'dotenv' 
dotenv.config()

const prisma = new PrismaClient()
const app = express()
const oneDay = 1000 * 60 * 60 * 24;

app.use(express.json())
app.use(session({
  secret: process.env.COOKIE_SECRET || 'xlfdgfdgrt5hjj',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: oneDay /*secure: true*/ }
}))

TwitterApiV2Settings.debug = true;

const options = { }

if (process.env.proxy_enabled == 'true'){
  //const proxy = process.env.APP_HTTP_PROXY || '';
  const proxy = process.env.HTTP_PROXY || ''; // http://proxy.luxbourse.local:8080  
  if (proxy){
    console.log('proxy=', proxy)
    options.httpAgent = new HttpsProxyAgent.HttpsProxyAgent(proxy);
  }
}

const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN, options );
//const twitterClient = new TwitterApi({ clientId: process.env.TWITTER_CLIENTID, clientSecret: process.env.TWITTER_CLIENTSECRET });

//const readOnlyClient = twitterClient.readOnly;

function getClient(){
  return twitterClient;

  if (!isLoggedIn()){
    throw new Error('Not logged in');
  }

  //solution 1: get cached client
  const loggedClient = cache.get('client');
  if (loggedClient){
    console.log('/// Client found /// ')
    return loggedClient;
  }

  //solution 2 : recreate client with accessToken
  const { accessToken, refreshToken } = cache.get('livetoken')
  console.log('@@client.accessToken', accessToken);
  console.log('@@client.refreshToken', refreshToken);

  const client = new TwitterApi({
    appKey: process.env.TWITTER_APIKEY,
    appSecret: process.env.TWITTER_APIKEY_SECRET ,
    accessToken, //TWITTER_ACCESS_TOKEN
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
  });
  return client;
}

async function getUserId(name){
  const user = await getClient().v2.userByUsername(name);
  console.log('userId> %s=%d', name, user.data.id)
  return user.data.id;
}

function isLoggedIn(){
  //const livetoken=cache.get('livetoken') || {};
  //console.log('livetoken=', livetoken)

  const { accessToken } = cache.get('livetoken') || {};
  return !!accessToken;
}

app.get('/tweets/login', async (req, res) => {
  if (isLoggedIn()){
    res.json('Already logged in');
    return;
  }

  try{
      console.log('api/login...');
      const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(process.env.URL_CALLBACK, { scope: ['tweet.read', 'users.read', 'offline.access'] });
      console.log('generateOAuth2AuthLink done ');

      const authObjects = { state, codeVerifier } || {}
      cache.set('token', authObjects)
      req.session.state=state;
      req.session.codeVerifier=codeVerifier;

      console.log('Please login on twitter : ', url);
      res.status(302).redirect(url);
    } catch (error) {
      console.error(error);
      res.status(401).json({ error: error })
    }
});

app.get('/tweets/callback', async (req, res) => {
  console.log('$$callback...');
  const { code, state } = req.query;

  if (!code){
    res.status(401).json('No code response from Twitter login');
    return;
  }

  try {
    const authObjects = cache.take('token') || {}
    //req.session.state=state;
    const codeVerifier = authObjects.codeVerifier || req.session.codeVerifier;

    // console.log('api/login/callback... session', req.session);
    // console.log('api/login/callback... authObjects', authObjects);
    // console.log('api/login/callback... code', code);
    // console.log('api/login/callback... state2', state);
    console.log('##api/login/callback... codeVerifier', codeVerifier);
    // console.log('api/login/callback... state1', authObjects.state);
    
    // ... user redirected to https://your-website.com?code=XXX&state=XXX after user app validation
    // Validate code to get access token
    const { client: loggedClient, accessToken, refreshToken, expiresIn } = await twitterClient.loginWithOAuth2({ code, codeVerifier, redirectUri: process.env.URL_CALLBACK });
    console.log('$$callback accessToken:', accessToken);
    console.log('$$callback refreshToken:', refreshToken);
    cache.set('livetoken', { accessToken, refreshToken })
    cache.set('client', loggedClient)
    //res.json({ accessToken, refreshToken })
    //res.redirect('/api/tweets/me');
    res.redirect('/api/tweets/traffic');
     
} catch (error) {
  console.error(error);
  res.status(401).json({ error: error })
}
});

app.get('/tweets/me', async (req, res) => {
  try {
    const user = await getClient().v2.me();
    res.json({ data: user })
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: error })
  }
});

app.get('/tweets/user/:name', async (req, res) => {
  const { name } = req.params
  try {
    const user = await getClient().v2.userByUsername(name);
    res.json({ data: user })
  } catch (error) {
    console.error(error);
    res.status(401).json({ error })
  }
});

app.get('/tweets/timeline', async (req, res) => {
  const userId = await getUserId('TERNancyMetzLux'); // 1196459569167454208
  
  try {
    const posts = await getClient().v2.userTimeline(userId, {
      'tweet.fields': ['author_id', 'source', 'id', 'text'],
      //expansions: ['attachments.media_keys', 'attachments.poll_ids', 'referenced_tweets.id'],
      'media.fields': ['url'],
    });
    res.json({ data: posts.data.data })
  } catch (error) {
    console.error(error);
    res.status(401).json({ error })
  }
});

//@TERNancyMetzLux #InfoTrafic
app.get('/tweets/traffic', async (req, res) => {
  const { topic } = req.params
  const userId = await getUserId('TERNancyMetzLux'); // 1196459569167454208
  try {
    console.log("search 'InfoTrafic'...");
    //const result = await readOnlyClient.v2.searchAll('JavaScript', { 'media.fields': 'url' });
    const result = await getClient().v2.searchAll('from:TERNancyMetzLux InfoTrafic',  { 
      'tweet.fields': ['author_id', 'source', 'id', 'text'],
      'media.fields': 'url' 
    });
    // for await (const tweet of jsTweets) {
    //   console.log(tweet);
    // }
    res.json({ data: result })
  } catch (error) {
    console.error(error);
    res.status(401).json({ error })
  }
});

//
// Prisma endpoints
//

app.post(`/user`, async (req, res) => {
  const result = await prisma.user.create({
    data: {
      email: req.body.email,
      name: req.body.name,
    },
  })
  res.json(result)
})

app.post('/post', async (req, res) => {
  const { title, content, authorEmail } = req.body
  const post = await prisma.post.create({
    data: {
      title,
      content,
      author: {
        connectOrCreate: {
          email: authorEmail
        }
      }
    }
  })
  res.status(200).json(post)
})

app.get('/drafts', async (req, res) => {
  const posts = await prisma.post.findMany({
    where: { published: false },
    include: { author: true }
  })
  res.json(posts)
})

app.get('/post/:id', async (req, res) => {
  const { id } = req.params
  const post = await prisma.post.findUnique({
    where: {
      id: Number(id),
    },
    include: { author: true }
  })
  res.json(post)
})

app.put('/publish/:id', async (req, res) => {
  const { id } = req.params
  const post = await prisma.post.update({
    where: {
      id: Number(id),
    },
    data: { published: true },
  })
  res.json(post)
})

app.get('/feed', async (req, res) => {
  const posts = await prisma.post.findMany({
    where: { published: true },
    include: { author: true },
  })
  res.json(posts)
})

app.delete(`/post/:id`, async (req, res) => {
  const { id } = req.params
  const post = await prisma.post.delete({
    where: {
      id: parseInt(id),
    },
  })
  res.json(post)
})

app.get('/filterPosts', async (req, res) => {
  const { searchString } = req.query
  const draftPosts = await prisma.post.findMany({
    where: {
      OR: [
        {
          title: {
            contains: searchString,
          },
        },
        {
          content: {
            contains: searchString,
          },
        },
      ],
    },
  })
  res.send(draftPosts)
})

  
/** 
* logic for our api will go here
*/
export default {
  path: '/api',
  handler: app
}