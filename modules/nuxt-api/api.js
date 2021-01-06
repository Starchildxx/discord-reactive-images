import * as ctx from '<%= relativeToBuild(options.ctxPath) %>'

<%= options.api.map(m => {
  if (!m.method) return
  return `import * as ${m.import} from '${relativeToBuild(m.filePath)}'` + '\n'
}).join('') %>
<%= options.auth.map(m => {
  if (!m.method) return
  return `import * as ${m.import} from '${relativeToBuild(m.filePath)}'` + '\n'
}).join('') %>

export function API(gs, $user) {
  return {
<%= options.api.map(m => {
  if (!m.method) return
  const exp = m.export === 'default' ? `${m.import}.default || ${m.import}` : `${m.import}['${m.export}']`
  return `    '${m.method}': (...args) => (${exp})({$user, ...ctx, ...gs}, ...args),` + '\n'
}).join('') %>
  }
}

export function Auth(gs) {
  return {
<%= options.auth.map(m => {
  if (!m.method) return
  const exp = m.export === 'default' ? `${m.import}.default || ${m.import}` : `${m.import}['${m.export}']`
  return `    '${m.method}': (...args) => (${exp})({...ctx, ...gs}, ...args),` + '\n'
}).join('') %>
  }
}
