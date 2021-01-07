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

export default async function (ctx, imageBase64) {
  if (!ctx.$user) throw new Error('Must be logged in')

  if (!imageBase64) {
    await ctx.query(`DELETE FROM images WHERE discord_id = ?`, [ctx.$user.id])
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

  await ctx.query(`REPLACE images (discord_id, filename) VALUES (?, ?)`, [ctx.$user.id, filename])

  ctx.setImage(ctx.$user.id, filename)

  return filename
}
