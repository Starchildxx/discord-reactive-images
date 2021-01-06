import express from 'express'
import API from './handler_api'
import Auth from './handler_auth'
import { setConfig, setImage } from './handler_ws'

const ctx = {
  setConfig,
  setImage,
}

const app = express()

app.use('/api', API(ctx))
app.use('/auth', Auth(ctx))

export default app
