<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" lg="10">
        <video src="https://cdn.discord-reactive-images.fugi.tech/dri_promo.mp4" muted autoplay loop></video>
        <div class="text-h2 text-center mb-4">Easy Discord to OBS integration</div>
        <div class="text-body-1">
          Discord Reactive Images allows you to easily visualize your Discord voice call in OBS with a single browser
          source. It's like <a href="https://streamkit.discord.com/overlay">Discord Streamkit</a> but more customizable
          and easier to use.
        </div>
        <div class="text-h4 my-3">Features</div>
        <ul>
          <li>Works regardless of which voice channel you're in.</li>
          <li>Upload a custom image, with your Discord avatar as the default.</li>
          <li>Adjust settings live.</li>
          <li>Multiple display options, such as including a bounce effect.</li>
        </ul>
        <div class="text-h4 my-3">How to use</div>
        <ol>
          <li>Login through Discord</li>
          <li>Go to the Manage page</li>
          <li>Upload your preferred image</li>
          <li>Copy the Group Browser Source link and add it to OBS as a browser source</li>
          <li>Set the browser source size to match your stream layout</li>
          <li>Adjust settings on Manage page to achieve your desired look</li>
        </ol>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {}
</script>

<style scoped>
video {
  display: block;
  margin: 0 auto 40px;
  max-width: 100%;
  max-height: 720px;
}
</style>
