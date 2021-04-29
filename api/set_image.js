import crypto from 'crypto'
import sharp from 'sharp'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import imagemin from 'imagemin'
import pngquant from 'imagemin-pngquant'

const s3 = new S3Client({
  region: 'nyc3',
  endpoint: 'https://nyc3.digitaloceanspaces.com',
  maxAttempts: 1,
})
s3.middlewareStack.add(
  (next) => async (args) => {
    delete args.request.headers['content-type']
    return next(args)
  },
  {step: 'build'},
)

export default async function (ctx, { image: imageBase64, user, purpose }) {
  if (!ctx.$user) throw new Error('Must be logged in')

  if (!['inactive', 'speaking'].includes(purpose)) {
    throw new Error('Invalid purpose')
  }

  if (!imageBase64) {
    if (ctx.$user.id === user) {
      await ctx.query(`UPDATE images SET ${purpose} = NULL WHERE discord_id = ?`, [user])
    } else {
      await ctx.query(`UPDATE overrides SET ${purpose} = NULL WHERE broadcaster_discord_id = ? AND guest_discord_id = ?`, [ctx.$user.id, user])
    }
    ctx.setImage(ctx.$user.id, user, purpose, null)
    return null
  }

  const imageBuffer = Buffer.from(imageBase64, 'base64')

  const rawImage = await sharp(imageBuffer).trim().resize({
    width: 1920,
    height: 1080,
    fit: 'inside',
    withoutEnlargement: true,
    kernel: 'lanczos3',
  }).png().toBuffer()

  const image = await imagemin.buffer(rawImage, {
    plugins: [
      pngquant({
        quality: [0.6, 0.9],
      }),
    ],
  })

  const hash = crypto.createHash('sha256')
  hash.update(image)
  const filename = `${hash.digest('hex')}.png`

  await s3.send(new PutObjectCommand({
    Bucket: 'discord-reactive-images',
    Key: filename,
    Body: image,
    ContentType: 'image/png',
    ACL: 'public-read',
  }), {

  })

  if (ctx.$user.id === user) {
    await ctx.query(`
      INSERT INTO images (discord_id, filename, ${purpose}) VALUES (?, '', ?)
      ON DUPLICATE KEY UPDATE ${purpose} = ?
    `, [user, filename, filename])
  } else {
    await ctx.query(`
      INSERT INTO overrides (broadcaster_discord_id, guest_discord_id, ${purpose}) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE ${purpose} = ?
    `, [ctx.$user.id, user, filename, filename])
  }

  ctx.setImage(ctx.$user.id, user, purpose, filename)

  return filename
}
