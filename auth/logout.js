import { Router } from 'express'

export default function(ctx) {
  const app = Router()

  app.get('/', async (req, res) => {
    res.clearCookie('user', { secure: process.env.NODE_ENV === 'production' })
    res.redirect(ctx.callbackDomain + (req.query.path || '/'))
  })

  return app
}
