import { TwitterApi } from 'twitter-api-v2'
import express, { Express, Request, Response } from 'express'
const client = new TwitterApi('<YOUR_APP_USER_TOKEN>')
const readOnlyClient = client.readOnly

const app: Express = express()

app.get('/user', async (req: Request, res: Response) => {
  const user = await readOnlyClient.v2.userByUsername('ludoo')
  res.json({ data: user })
})

app.get('/js', async (req: Request, res: Response) => {
  const jsTweets = await client.v2.search('JavaScript', {
    'media.fields': 'url',
  })
  // for await (const tweet of jsTweets) {
  //   console.log(tweet);
  // }
  res.json({ data: jsTweets })
})

export default app
