import fetch from 'node-fetch'
import { stringify } from 'querystring'

export default async function (ctx, code) {
  const tokenResp = await fetch(`https://discord.com/api/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: stringify({
      client_id: process.env.DISCORD_ID,
      client_secret: process.env.DISCORD_SECRET,
      code: code,
      grant_type: 'authorization_code',
      scope: ctx.discordScopes,
    }),
  })
  const tokenData = await tokenResp.json()

  if (!tokenResp.ok) {
    console.log('Bad token response', tokenData)
    throw new Error('Bad token response')
  }

  const userResp = await fetch(`https://discord.com/api/users/@me`, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  })
  const userData = await userResp.json()

  if (!userResp.ok || !userData.id) {
    console.log('Bad user response', userData)
    throw new Error('Bad user response')
  }

  const jwt = await ctx.encodeJWT({
    id: userData.id,
    token: tokenData.access_token,
    username: userData.username,
    discriminator: userData.discriminator,
    avatar: userData.avatar,
  })

  const { results } = await ctx.query(`SELECT * FROM configs WHERE discord_id = ?`, [userData.id])
  const config = results && results.length ? results[0] : {}

  return {
    id: userData.id,
    token: tokenData.access_token,
    jwt: jwt,
    includeSelf: !!config.include_self || false,
    bounce: !!config.bounce || false,
    gapPercentage: +config.gap_percentage || 0,
  }
}
