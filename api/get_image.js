export default async function(ctx, discord_id) {
  const { results } = await ctx.query(`SELECT filename FROM images WHERE discord_id = ?`, [discord_id])

  return results && results.length ? results[0].filename : null
}
