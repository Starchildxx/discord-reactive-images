<template>
  <v-container fluid :fill-height="!$user">
    <v-row v-if="!$user" justify="center" align="center">
      <v-col cols="auto">
        <v-btn x-large outlined color="primary" :href="login('discord')">Login</v-btn>
      </v-col>
    </v-row>
    <v-row v-else>
      <v-col cols="12" md="6" lg="8" xl="9" order-md="last">
        <v-card class="mb-4">
          <v-card-title> Links </v-card-title>
          <v-card-text>
            <v-text-field v-for="(text, label) in links" :key="`link-${text}`" :label="label" :value="text" readonly>
              <template slot="append-outer">
                <v-tooltip top>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn icon @click.prevent="copyText(text)" v-bind="attrs" v-on="on">
                      <v-icon>mdi-content-copy</v-icon>
                    </v-btn>
                  </template>

                  <span>Copy to Clipboard</span>
                </v-tooltip>
              </template>
            </v-text-field>

            <div class="text-caption">
              Copy one of the links above and add it to OBS as a browser source. Set the height & width to the max size
              you're willing for the images to take up.
              <strong>Warning:</strong> Images can re-arrange or re-size when users join or leave, so do not rely on
              this to hide sensitive information like Among Us room codes.
            </div>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title> Config </v-card-title>
          <v-card-text>
            <v-form @submit.prevent="saveConfig">
              <v-switch label="Include Self" v-model="includeSelf"></v-switch>
              <v-switch label="Bounce Effect" v-model="bounce"></v-switch>
              <v-slider label="Image Spacing" v-model="gapPercentage" min="-500" max="50" thumb-label></v-slider>

              <v-btn block color="primary" type="submit" :disabled="configSaving" :loading="configSaving">Apply</v-btn>

              <v-alert v-if="configError" class="mt-4" type="error">
                {{ configError }}
              </v-alert>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6" lg="4" xl="3">
        <v-card>
          <v-card-title> Set Image </v-card-title>
          <v-card-text>
            <v-img class="mb-4" :src="imagePreview" max-height="1080" contain />

            <v-file-input v-model="imageFile" label="New Image" prepend-icon="mdi-camera" accept="image/*" show-size />

            <v-btn block color="primary" :disabled="!imageData || imageSaving" :loading="imageSaving" @click="setImage">
              Save
            </v-btn>

            <v-btn class="mt-3" block color="red" :disabled="!currentImage || imageSaving" :loading="imageSaving" @click="clearImage">
              Revert to Discord avatar
            </v-btn>

            <v-alert v-if="error" class="mt-4" type="error">
              {{ error }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  async asyncData({ $user, $api }) {
    if (!$user) return {}
    const image = await $api.get_image($user.id)
    let config = {}
    try {
      config = await $api.get_config()
    } catch (_) {}
    return {
      currentImage: image,
      ...config,
    }
  },
  data() {
    return {
      error: null,
      imageFile: null,
      imageDataURL: null,
      imageSaving: false,

      configError: null,
      configSaving: false,

      links: {
        'Group Browser Source': 'https://discord-reactive-images.fugi.tech/group',
        'Individual Browser Source (You)': `https://discord-reactive-images.fugi.tech/individual/${this.$user && this.$user.id}`,
      },
    }
  },
  computed: {
    imagePreview() {
      return (
        this.imageDataURL ||
        (this.currentImage && `https://cdn.discord-reactive-images.fugi.tech/${this.currentImage}`) ||
        `https://cdn.discordapp.com/avatars/${this.$user.id}/${this.$user.avatar}.png?size=1024`
      )
    },
    imageData() {
      if (!this.imageDataURL) return null
      return this.imageDataURL.replace(/^.*?;base64,/, '')
    },
  },
  methods: {
    login(platform) {
      return `/auth/${platform}/login?path=${encodeURIComponent(this.$route.fullPath)}`
    },
    async setImage() {
      if (!this.imageData) return
      this.imageSaving = true

      try {
        const image = await this.$api.set_image(this.imageData)

        this.currentImage = image
        this.imageFile = null
        this.error = null
      } catch (err) {
        this.error = err.message
      }

      this.imageSaving = false
    },
    async clearImage() {
      if (!this.currentImage) return
      this.imageSaving = true

      try {
        const image = await this.$api.set_image(null)

        this.currentImage = image
        this.imageFile = null
        this.error = null
      } catch (err) {
        this.error = err.message
      }

      this.imageSaving = false
    },
    async saveConfig() {
      this.configSaving = true

      try {
        await this.$api.set_config({
          includeSelf: this.includeSelf,
          bounce: this.bounce,
          gapPercentage: this.gapPercentage,
        })

        this.configError = null
      } catch (err) {
        this.configError = err.message
      }

      this.configSaving = false
    },
    copyText(text) {
      navigator.clipboard.writeText(text)
    },
  },
  watch: {
    imageFile(v) {
      if (!v) {
        this.imageDataURL = null
        return
      }

      const reader = new FileReader()
      reader.addEventListener('load', () => {
        this.imageDataURL = reader.result
      })
      reader.addEventListener('error', () => {
        this.imageDataURL = null
      })
      reader.readAsDataURL(v)
    },
  },
}
</script>
