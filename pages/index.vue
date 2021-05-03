<template>
  <v-app dark :class="tutorialClass">
    <v-app-bar app>
      <v-toolbar-title class="hidden-xs-only">
        <nuxt-link to="/" exact class="title-link">
          Discord Reactive Images
        </nuxt-link>
      </v-toolbar-title>
      <v-spacer />

      <template v-if="$user">
        <v-btn outlined color="green" @click="setTutorial(1)">Tutorial</v-btn>
        <v-avatar class="ml-4">
          <img :src="`https://cdn.discordapp.com/avatars/${$user.id}/${$user.avatar}.png?size=64`" />
        </v-avatar>
        <span class="ml-4">{{ $user.username }}#{{ $user.discriminator }}</span>
        <v-btn class="ml-4" outlined color="red" :href="logout()">Logout</v-btn>
      </template>

      <template v-else>
        <v-btn outlined color="primary" :href="login('discord')">Login</v-btn>
      </template>
    </v-app-bar>
    <v-main>
      <v-container :fluid="!!$user">
        <v-row v-if="!$user" justify="center">
          <v-col cols="12" lg="10" xl="8">
            <video src="https://cdn.discord-reactive-images.fugi.tech/dri_promo.mp4" muted autoplay loop></video>
            <div class="text-h2 text-center mb-4">Easy Discord to OBS integration</div>
            <div class="text-body-1 mb-4">
              Discord Reactive Images allows you to easily visualize your Discord voice call in OBS with a single browser
              source. It's like <a href="https://streamkit.discord.com/overlay">Discord Streamkit</a> but more customizable
              and easier to use. Just login with Discord, upload an image, join any voice channel and adjust the settings
              in real time.
            </div>
            <v-btn x-large block color="primary" :href="login('discord')">Login</v-btn>
          </v-col>
        </v-row>
        <v-row v-else>
          <v-col cols="12">
            <v-alert v-if="error" class="mb-0" type="error" outlined>
              {{ error }}
            </v-alert>
          </v-col>
          <v-col cols="12" md="4" lg="6" order-md="last">
            <v-card class="mb-4 links">
              <v-card-title> Links </v-card-title>
              <v-card-text>
                <v-text-field v-for="l in links" :key="`link-${l.value}`" :class="l.class" :label="l.label" :value="l.value" readonly>
                  <template slot="append">
                    <v-tooltip top>
                      <template v-slot:activator="{ on, attrs }">
                        <v-btn icon @click.prevent="copyText(l.value)" v-bind="attrs" v-on="on">
                          <v-icon>mdi-content-copy</v-icon>
                        </v-btn>
                      </template>

                      <span>Copy to Clipboard</span>
                    </v-tooltip>
                  </template>
                  <template slot="append-outer">
                    <v-dialog width="800" :value="tutorial === 13 && l.settings && l.settings.id === '00000000000000001'" eager>
                      <template v-slot:activator="{ on: dialogO, attrs: dialogA }">
                        <v-tooltip top>
                          <template v-slot:activator="{ on: tooltipO, attrs: tooltipA }">
                            <v-btn
                              class="source-settings"
                              icon
                              v-bind="{ ...dialogA, ...tooltipA }"
                              v-on="{ ...dialogO, ...tooltipO }"
                              :disabled="!l.settings"
                            >
                              <v-icon>mdi-cog</v-icon>
                            </v-btn>
                          </template>

                          <span>Settings</span>
                        </v-tooltip>
                      </template>

                      <v-card v-if="l.settings" class="source-settings-modal">
                        <v-card-title class="justify-center">{{ l.settings.name }} Settings</v-card-title>
                        <v-card-text>
                          <v-row justify="center">
                            <v-col cols="12" sm="6">
                              <image-upload
                                class="inactive-image"
                                title="Set Inactive Image"
                                v-model="l.settings.inactive"
                                :fallback="l.settings.speaking"
                                :base="l.settings.inactiveBase"
                                :user="l.settings.id"
                                purpose="inactive"
                              />
                            </v-col>
                            <v-col cols="12" sm="6">
                              <image-upload
                                class="speaking-image"
                                title="Set Speaking Image"
                                v-model="l.settings.speaking"
                                :fallback="l.settings.inactive"
                                :base="l.settings.speakingBase"
                                :user="l.settings.id"
                                purpose="speaking"
                              />
                            </v-col> </v-row
                        ></v-card-text>
                      </v-card>
                    </v-dialog>
                  </template>
                </v-text-field>

                <div class="text-caption links-warning">
                  Copy one of the links above and add it to OBS as a browser source. Set the height & width to the max size
                  you're willing for the images to take up.
                  <strong>Warning:</strong> Images can re-arrange or re-size when users join or leave, so do not rely on
                  this to hide sensitive information like Among Us room codes.
                </div>
              </v-card-text>
            </v-card>

            <v-card class="config">
              <v-card-title> Config </v-card-title>
              <v-card-text>
                <v-form @submit.prevent="saveConfig">
                  <v-checkbox class="bounce" label="Bounce Effect" v-model="config.bounce" hide-details></v-checkbox>
                  <v-checkbox class="include-self" label="Include Own Image in Group view" v-model="config.includeSelf" hide-details></v-checkbox>

                  <v-slider class="mt-4 image-spacing" label="Image Spacing" v-model="config.gapPercentage" min="-500" max="50" thumb-label hide-details></v-slider>

                  <v-btn class="mt-4" block color="primary" type="submit" :disabled="configSaving" :loading="configSaving">Apply</v-btn>

                  <v-alert v-if="configError" class="mt-4" type="error">
                    {{ configError }}
                  </v-alert>
                </v-form>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="4" lg="3">
            <image-upload
              class="inactive-image"
              title="Set Inactive Image"
              v-model="currentImages.inactive"
              :fallback="currentImages.speaking"
              :base="currentImages.base"
              :user="$user.id"
              purpose="inactive"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4" lg="3">
            <image-upload
              class="speaking-image"
              title="Set Speaking Image"
              v-model="currentImages.speaking"
              :fallback="currentImages.inactive"
              :base="currentImages.base"
              :user="$user.id"
              purpose="speaking"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    <v-footer>
      <div class="text-caption">
        Made by <a href="https://twitter.com/Fugiman">Fugi</a>.
        <a href="https://github.com/Fugiman/discord-reactive-images">Source code available on Github</a>.
        For issues or suggestions @ me on Twitter or file an issue on Github.
        <a href="https://paypal.me/fugiman" target="_blank">Donate</a> if you'd like.
      </div>
    </v-footer>
    <v-overlay v-if="tutorial > 0" opacity="0.9">
      <tutorial-step :step="1" bottom>Welcome to Discord Reactive Images. This site allows you to visualize a Discord call in your stream. In this tutorial we will explain how to set your image, configure the browser source, and add it to OBS.</tutorial-step>
      <tutorial-step :step="2" activator=".inactive-image" right>The Inactive Image is what is displayed when not speaking. By default it is a dimmed version of your Discord avatar.</tutorial-step>
      <tutorial-step :step="3" activator=".inactive-image .v-file-input" right>To upload a custom Inactive Image, click the New Image field. A file browser will appear for you to select any image you'd like from your computer.</tutorial-step>
      <tutorial-step :step="4" activator=".inactive-image .image-upload-save" right>After selecting your image, press SAVE to upload it, and it will update all Browser Sources without needing a refresh.</tutorial-step>
      <tutorial-step :step="5" activator=".inactive-image .image-upload-revert" right>If you would like to return to using your Discord avatar instead of a custom image, press REVERT at any time.</tutorial-step>
      <tutorial-step :step="6" activator=".speaking-image" right>The Speaking Image is what is displayed when you speak in your Discord voice call. By default it is the undimmed version of the Inactive Image.</tutorial-step>
      <tutorial-step :step="7" activator=".speaking-image" right>Uploading a custom Speaking Image and saving it works exactly the same as the Inactive Image. Likewise, REVERT will set the Speaking Image to the same as the Inactive Image.</tutorial-step>
      <tutorial-step :step="8" activator=".links" left>Links are the URLs for you to input into OBS (or other streaming software) as a Browser Source.</tutorial-step>
      <tutorial-step :step="9" activator=".links .group-source" left>The Group Source includes an image for every person in your voice call automatically. It is the easiest to set up and works well if the people in your call change frequently, but lacks the control of Individual sources.</tutorial-step>
      <tutorial-step :step="10" activator=".links .self-source" left>Your Individual Source contains just your image. It allows you to make yourself bigger than others in the call, but does still require you to be in a Discord voice call.</tutorial-step>
      <tutorial-step :step="11" activator=".links .other-source" left>Other members of your voice call will also appear in the Links list as Individual Sources. If you know who will be in the call ahead of time, the Individual Sources allow more freedom in how you arrange the sizing and position of your guests.</tutorial-step>
      <tutorial-step :step="12" activator=".links .other-source .source-settings" left>In addition, you can customize the images for each guest by clicking the Settings Cog.</tutorial-step>
      <tutorial-step :step="13" activator="" bottom>Clicking the Settings Cog will bring up a window with the Inactive and Speaking Images for that person. Uploading and Saving images works the same as previously described. REVERT sets the image back to what the other person uploaded, restoring their control over their appearence.</tutorial-step>
      <tutorial-step :step="14" activator=".links .links-warning" left>Please do not miss the warning: These images can move or change at any time and should not be relied upon to obscure content, such as codes.</tutorial-step>
      <tutorial-step :step="15" activator=".config" left>Config allows you to adjust the appearence and functionality of the Browser Sources.</tutorial-step>
      <tutorial-step :step="16" activator=".config .bounce" left>Bounce Effect will cause the image to "bounce" up and down 10 pixels every time they begin speaking. It draws extra attention to the speaker but can be distracting.</tutorial-step>
      <tutorial-step :step="17" activator=".config .include-self" left>Include Own Image in Group View determines whether your own image appears in the Group Browser Source. Disable this if you use an Individual Source or have some other way of representing yourself.</tutorial-step>
      <tutorial-step :step="18" activator=".config .image-spacing" left>Image Spacing controls how spread apart images are in the Group Source. Positive numbers add a gap between images, negative numbers overlap the images. Useful if the images have transparent backgrounds and are wide.</tutorial-step>
      <tutorial-step :step="19" activator=".config .v-btn.primary" left>Any changes to the config will not take effect until you press the APPLY button, at which point it will update all Browser Sources without needing a refresh.</tutorial-step>
      <tutorial-step :step="20" activator=".v-footer" final top>That covers all the features of the site. Thank you for trying out Discord Reactive Images! If you need any help please reach out to me on Twitter or Github.</tutorial-step>
    </v-overlay>
  </v-app>
</template>

<script lang="ts">
import { defineComponent, computed, useContext, useStore, toRefs, reactive, ref } from '@nuxtjs/composition-api'
import { useDiscordRPC } from '~/assets/discordrpc'

interface State {
  tutorial: Number
}

interface Link {
  label: string
  value: string
  class?: string
  settings?: {
    id: string
    name: string
    speaking?: string
    inactive?: string
    speakingBase: string
    inactiveBase: string
  }
}

export default defineComponent({
  setup() {
    // @ts-ignore
    const { $api, $user, $route } = useContext()

    const { members, config, error } = useDiscordRPC()

    const store = useStore<State>()

    const data = reactive({
      configError: null,
      configSaving: false,
    })

    const tutorial = computed(() => {
      return store.state.tutorial
    })

    const tutorialClass = computed(() => {
      return tutorial.value ? `tutorial-${tutorial.value.toString().padStart(2, '0')}` : null
    })

    const currentImages = ref({
      inactive: null,
      speaking: null,
      base: '',
    })
    if ($user) {
      $api.get_image($user.id).then((v: any) => {
        currentImages.value = {
          ...v,
          base: `https://cdn.discordapp.com/avatars/${$user.id}/${$user.avatar}.png?size=1024`,
        }
      })
    }

    const otherMembers = computed(() => {
      return members.value.filter((m) => m.id !== config.value.id)
    })

    const links = computed(() => {
      const r: Link[] = [
        {
          label: 'Group Browser Source',
          value: 'https://discord-reactive-images.fugi.tech/group',
          class: 'group-source',
        },
        {
          label: 'Individual Browser Source (You)',
          value: `https://discord-reactive-images.fugi.tech/individual/${$user && $user.id}`,
          class: 'self-source',
        },
      ]

      if (tutorial.value > 0) {
        r.push({
          label: `Individual Browser Source (FriendA)`,
          value: `https://discord-reactive-images.fugi.tech/individual/00000000000000001`,
          class: 'other-source',
          settings: {
            id: '00000000000000001',
            name: 'FriendA',
            speakingBase: 'https://cdn.discord-reactive-images.fugi.tech/f324bfce399f6ec885658d3da0e33c7040c52dcc7135015cdba6b9222a0baeff.png',
            inactiveBase: 'https://cdn.discord-reactive-images.fugi.tech/f324bfce399f6ec885658d3da0e33c7040c52dcc7135015cdba6b9222a0baeff.png',
          }
        })
        r.push({
          label: `Individual Browser Source (FriendB)`,
          value: `https://discord-reactive-images.fugi.tech/individual/00000000000000002`,
          settings: {
            id: '00000000000000002',
            name: 'FriendB',
            speakingBase: 'https://cdn.discord-reactive-images.fugi.tech/f324bfce399f6ec885658d3da0e33c7040c52dcc7135015cdba6b9222a0baeff.png',
            inactiveBase: 'https://cdn.discord-reactive-images.fugi.tech/f324bfce399f6ec885658d3da0e33c7040c52dcc7135015cdba6b9222a0baeff.png',
          }
        })
        return r
      }

      for (const m of otherMembers.value) {
        r.push({
          label: `Individual Browser Source (${m.name})`,
          value: `https://discord-reactive-images.fugi.tech/individual/${m.id}`,
          settings: {
            id: m.id,
            name: m.name,
            speaking: m.rawImages?.speakingOverride,
            inactive: m.rawImages?.inactiveOverride,
            speakingBase:
              (m.rawImages?.speaking && `https://cdn.discord-reactive-images.fugi.tech/${m.rawImages?.speaking}`) ||
              (m.rawImages?.inactive && `https://cdn.discord-reactive-images.fugi.tech/${m.rawImages?.inactive}`) ||
              `https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png?size=1024`,
            inactiveBase:
              (m.rawImages?.inactive && `https://cdn.discord-reactive-images.fugi.tech/${m.rawImages?.inactive}`) ||
              (m.rawImages?.speaking && `https://cdn.discord-reactive-images.fugi.tech/${m.rawImages?.speaking}`) ||
              `https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png?size=1024`,
          },
        })
      }

      return r
    })

    return {
      error,
      config,
      ...toRefs(data),
      tutorial,
      tutorialClass,
      setTutorial: (step: number) => {
        store.commit('setTutorial', step)
      },
      currentImages,
      otherMembers,
      links,
      login(platform: string) {
        return `/auth/${platform}/login?path=${encodeURIComponent($route?.fullPath || '/')}`
      },
      logout() {
        return `/auth/logout?path=${encodeURIComponent($route?.fullPath || '/')}`
      },
      copyText(text: string) {
        navigator.clipboard.writeText(text)
      },
      async saveConfig() {
        data.configSaving = true

        try {
          await $api.set_config({
            includeSelf: config.value.includeSelf,
            bounce: config.value.bounce,
            gapPercentage: config.value.gapPercentage,
          })

          data.configError = null
        } catch (err) {
          data.configError = err.message
        }

        data.configSaving = false
      },
    }
  },
})
</script>

<style>
.inactive-image .v-image {
  filter: brightness(50%);
}

.tutorial-02 .inactive-image,
.tutorial-03 .inactive-image .v-file-input,
.tutorial-04 .inactive-image .image-upload-save,
.tutorial-05 .inactive-image .image-upload-revert,
.tutorial-06 .speaking-image,
.tutorial-07 .speaking-image,
.tutorial-08 .links,
.tutorial-09 .links .group-source,
.tutorial-10 .links .self-source,
.tutorial-11 .links .other-source,
.tutorial-12 .links .other-source .source-settings,
.tutorial-13 .source-settings-modal,
.tutorial-14 .links .links-warning,
.tutorial-15 .config,
.tutorial-16 .config .bounce,
.tutorial-17 .config .include-self,
.tutorial-18 .config .image-spacing,
.tutorial-19 .config .v-btn.primary,
.tutorial-20 .v-footer {
  z-index: 6 !important;
  position: relative !important;
  box-shadow: 0 0 16px #1976d2 !important;
  border-radius: 12px !important;
  pointer-events: none !important;
}

.tutorial-13 .v-overlay {
  z-index: 5 !important;
}
.tutorial-13 .v-dialog__content {
  z-index: 6 !important;
}
.tutorial-13 .v-dialog {
  overflow: visible !important;
}
</style>

<style scoped>
.title-link {
  color: inherit !important;
  text-decoration: none;
}

video {
  display: block;
  margin: 0 auto 40px;
  max-width: 100%;
  max-height: 720px;
}
</style>
