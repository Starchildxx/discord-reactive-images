import express from 'express'
import API from './handler_api'
import Auth from './handler_auth'

export const globalState = {
  connections: new Map(),
}

const app = express()

app.use('/api', API(globalState))
app.use('/auth', Auth(globalState))

export default app
