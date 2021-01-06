import fetch from 'node-fetch'
import { stringify } from 'querystring'
import { Router } from 'express'

export default function (ctx) {
  const app = Router()

  app.get('/login', async (req, res) => {
    const n = ctx.nonce()

    res.cookie(
      'login',
      ctx.encrypt({
        path: req.query.path || '/',
        nonce: n,
      }),
      { httpOnly: true, secure: process.env.NODE_ENV === 'production' }
    )

    res.redirect(
      `https://discord.com/api/oauth2/authorize?${stringify({
        client_id: process.env.DISCORD_ID,
        redirect_uri: `${ctx.callbackDomain}/auth/discord/callback`,
        response_type: 'code',
        scope: ctx.discordScopes,
        state: n,
        prompt: 'none',
      })}`
    )
  })

  app.get('/callback', async (req, res) => {
    if (!req.cookies.login) {
      res.status(400).send()
      return
    }
    const cookie = ctx.decrypt(req.cookies.login)
    res.clearCookie('login', { httpOnly: true, secure: process.env.NODE_ENV === 'production' })

    if (cookie.nonce !== req.query.state) {
      console.log('Mismatched nonce!', cookie.nonce, req.query.state)
      res.status(400).send()
      return
    }

    const tokenResp = await fetch(`https://discord.com/api/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stringify({
        client_id: process.env.DISCORD_ID,
        client_secret: process.env.DISCORD_SECRET,
        code: req.query.code,
        grant_type: 'authorization_code',
        redirect_uri: `${ctx.callbackDomain}/auth/discord/callback`,
        scope: ctx.discordScopes,
      }),
    })
    const tokenData = await tokenResp.json()

    if (!tokenResp.ok) {
      console.log('Bad token response', tokenData)
      res.status(400).send()
      return
    }

    const userResp = await fetch(`https://discord.com/api/users/@me`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })
    const userData = await userResp.json()

    if (!userResp.ok || !userData.id) {
      console.log('Bad user response', userData)
      res.status(400).send()
      return
    }

    const jwt = await ctx.encodeJWT({
      id: userData.id,
      token: tokenData.access_token,
      username: userData.username,
      discriminator: userData.discriminator,
      avatar: userData.avatar,
    })

    res.cookie('user', jwt, { secure: process.env.NODE_ENV === 'production' })
    res.redirect(ctx.callbackDomain + (cookie.path || '/'))
  })

  return app
}
