import express, { Express, Request, Response } from 'express'

const app: Express = express()
const port = process.env.PORT

app.use(express.json())

app.get('/rest', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server')
})

// export default {
//   path: '/api',
//   handler: app
// }
export default app
