import path from 'path'
import fs from 'fs'
import globby from 'globby'

import ws from 'ws'
import Websockets from './handler_ws'

const defaultOptions = {
  // folder to load API methods from
  dir: '~/api',
  // folder to load Auth methods from
  authDir: '~/auth',
  // Name of the injected Vue variable, accessed with this.$variable
  variable: 'api',
  // File extensions supported
  extensions: null,
}

export default async function NuxtAPI(moduleOptions) {
  const options = Object.assign({}, defaultOptions, this.options.api, moduleOptions)
  const { nuxt } = this

  const getDir = (p) => (fs.statSync(p).isDirectory() ? p : path.dirname(p))

  let dirPath = options.dir
  try {
    dirPath = getDir(nuxt.resolver.resolvePath(dirPath))
  } catch (err) {
    console.error(err)
  }
  nuxt.options.build.watch.push(dirPath)

  let authDirPath = options.authDir
  try {
    authDirPath = getDir(nuxt.resolver.resolvePath(authDirPath))
  } catch (err) {
    console.error(err)
  }
  nuxt.options.build.watch.push(authDirPath)

  let apiMethods = []
  let authMethods = []
  this.addTemplate({
    fileName: 'nuxt-api.js',
    src: path.resolve(__dirname, 'api.js'),
    mode: 'server',
    options: {
      ctxPath: path.join(dirPath, 'index.js'),
      api: apiMethods,
      auth: authMethods,
    },
  })

  this.addPlugin({
    src: path.resolve(__dirname, 'plugin.client.js'),
    mode: 'client',
    options,
  })

  this.addPlugin({
    src: path.resolve(__dirname, 'plugin.server.js'),
    mode: 'server',
    options,
  })

  this.addServerMiddleware({
    path: '/',
    handler: path.resolve(__dirname, 'handler.js'),
  })

  nuxt.hook('listen', (server) => {
    const wss = new ws.Server({ server, path: '/api' })
    Websockets(wss)
  })

  let builderExtensions = []
  nuxt.hook('build:before', (builder) => {
    builderExtensions = builder.supportedExtensions
  })

  nuxt.hook('build:templates', async () => {
    apiMethods.length = 0
    authMethods.length = 0
    const extensions = options.extensions || builderExtensions

    for (const fileName of await globby(`**/*.{${extensions.join(',')},}`, { cwd: dirPath })) {
      let key = fileName.split(path.sep)
      key[key.length - 1] = path.basename(key[key.length - 1], path.extname(key[key.length - 1]))
      if (key[key.length - 1].toLowerCase() === 'index') key.pop()

      if (key.some((v) => v.includes('.'))) throw new Error('API filenames may not contain 2+ periods')

      apiMethods.push({
        import: '_api_import_' + key.join('_'),
        method: key.join('.'),
        filePath: path.join(dirPath, fileName),
        chunkName: '?',
        export: 'default',
      })
    }

    for (const fileName of await globby(`**/*.{${extensions.join(',')},}`, { cwd: authDirPath })) {
      let key = fileName.split(path.sep)
      key[key.length - 1] = path.basename(key[key.length - 1], path.extname(key[key.length - 1]))
      if (key[key.length - 1].toLowerCase() === 'index') key.pop()

      if (key.some((v) => v.includes('.'))) throw new Error('Auth filenames may not contain 2+ periods')

      authMethods.push({
        import: '_auth_import_' + key.join('_'),
        method: key.join('.'),
        filePath: path.join(authDirPath, fileName),
        chunkName: '?',
        export: 'default',
      })
    }
  })
}
