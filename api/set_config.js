export default async function (ctx, config) {
  if (!ctx.$user) throw new Error('Must be logged in')

  config = {
    includeSelf: config.includeSelf || false,
    bounce: config.bounce || false,
    gapPercentage: config.gapPercentage || 0,
  }

  await ctx.query(`REPLACE configs (discord_id, include_self, bounce, gap_percentage) VALUES (?, ?, ?, ?)`, [
    ctx.$user.id,
    config.includeSelf,
    config.bounce,
    config.gapPercentage,
  ])

  ctx.setConfig(ctx.$user.id, config)

  return null
}
