import crypto from 'crypto'
import mysql from 'mysql2/promise'
import { secretbox, randomBytes } from 'tweetnacl'
import SignJWT from 'jose/dist/node/cjs/jwt/sign'
import VerifyJWT from 'jose/dist/node/cjs/jwt/verify'

export const database = mysql.createPool(`mysql://${process.env.MYSQL}/discord-reactive-images?charset=utf8mb4&timezone=Z`)

export async function query(statement, values) {
  const [results, fields] = await database.execute(statement, values)
  return { results, fields }
}


export const callbackDomain =
  process.env.NODE_ENV === 'production' ? 'https://discord-reactive-images.fugi.tech' : 'http://localhost:3000'

export const discordScopes = 'rpc identify'

export function nonce() {
  const word_characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''

  for (let i = 0; i < 32; i++) {
    result += word_characters[parseInt(Math.random() * word_characters.length, 10)]
  }

  return result
}

const naclKey = () => Buffer.from(process.env.NACL_KEY, 'base64')
const jwtKey = () => crypto.createSecretKey(process.env.JWT_KEY, 'base64')

export function encrypt(obj) {
  const message = Buffer.from(JSON.stringify(obj))
  const nonce = randomBytes(secretbox.nonceLength)
  const box = secretbox(message, nonce, naclKey())
  return Buffer.from([...nonce, ...box]).toString('base64')
}

export function decrypt(str) {
  const data = Buffer.from(str, 'base64')
  const nonce = data.slice(0, secretbox.nonceLength)
  const message = secretbox.open(data.slice(secretbox.nonceLength), nonce, naclKey())
  return JSON.parse(Buffer.from(message).toString('utf-8'))
}

export async function encodeJWT(obj) {
  const jwt = await new SignJWT(obj)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(jwtKey())

  return jwt
}

export async function decodeJWT(jwt) {
  const { payload } = await VerifyJWT(jwt, jwtKey(), {
    algorithms: ['HS256'],
  })
  return payload
}


export async function getImages(broadcaster_id, guest_id) {
  const ret = {}

  const { results } = await query(`SELECT inactive, speaking FROM images WHERE discord_id = ?`, [guest_id])
  if (results && results.length) {
    ret.inactive = results[0].inactive
    ret.speaking = results[0].speaking
  }

  if (broadcaster_id) {
    const { results } = await query(`SELECT inactive, speaking FROM overrides WHERE broadcaster_discord_id = ? AND guest_discord_id = ?`, [broadcaster_id, guest_id])
    if (results && results.length) {
      ret.inactiveOverride = results[0].inactive
      ret.speakingOverride = results[0].speaking
    }
  }

  return ret
}
