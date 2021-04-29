export default async function(ctx, discord_id) {
  return await ctx.getImages(ctx.$user && ctx.$user.id, discord_id)
}
