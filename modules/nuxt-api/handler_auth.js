import { Router } from 'express'
import cookieParser from 'cookie-parser'
import { Auth } from '../../.nuxt/nuxt-api.js'

export default function (globalState) {
  const app = Router()
  app.use(cookieParser())

  const methods = Auth(globalState)
  for (const [path, handlerFactory] of Object.entries(methods)) {
    app.use('/' + path, handlerFactory())
  }

  return app
}
