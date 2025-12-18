
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { v4 as uuid } from 'uuid'

export interface RestMonArgs {
  url?: string
  payload?: string
  outputFormat?: 'json' | 'xml' | 'text'
  method?: 'GET' | 'POST'
  searchKey?: string
  searchString?: string
  matchRegex?: string
  username?: string
  password?: string
  decryptPass?: 'TRUE' | 'FALSE'
  encryptPass?: 'TRUE' | 'FALSE'
}

export interface ScriptInstance {
  id: string
  instanceName: string
  scriptPath: string
  args: RestMonArgs
  pollIntervalSec?: number
  timeoutSec?: number
  regexField?: string
}

export interface Device {
  id: string
  name: string
  forcedIp?: string
  port?: number | null
  connectionTimeoutMs?: number | null
  connectionPollSec?: number | null
  username?: string
  password?: string
  publicKeyPath?: string
  privateKeyPath?: string
  passphrase?: string
  scripts: ScriptInstance[]
}

export interface FBCSKMState {
  devices: Device[]
}

const initialState: FBCSKMState = { devices: [] }

/**
 * Normalize smart quotes and parse CLI-like args to structured RestMonArgs.
 */
function parseArgsToStruct(argstr: string): RestMonArgs {
  const args: RestMonArgs = {}

  // Normalize smart quotes to straight quotes
  const normalized = (argstr ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')

  // Tokenize: keep quoted segments intact, otherwise split on whitespace
  const tokens = normalized.match(/(?:"[^"]*"|'[^']*'|\S+)/g) || []

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (!t.startsWith('-')) continue

    const key = t.replace(/^--?/, '').toLowerCase()
    const next = tokens[i + 1]
    const valRaw = (next && !next.startsWith('-')) ? next : undefined
    const val = valRaw ? valRaw.replace(/^['"]|['"]$/g, '') : 'TRUE'

    switch (key) {
      case 'url':
        args.url = val
        break
      case 'payload':
        args.payload = val
        break
      case 'outputformat':
        if (['json', 'xml', 'text'].includes(val.toLowerCase())) {
          args.outputFormat = val.toLowerCase() as any
        }
        break
      case 'method':
        if (['get', 'post', 'GET', 'POST'].includes(val)) {
          args.method = val.toUpperCase() as any
        }
        break
      case 'searchkey':
        args.searchKey = val
        break
      case 'searchstring':
        args.searchString = val
        break
      case 'matchregex':
        args.matchRegex = val
        break
      case 'username':
        args.username = val
        break
      case 'password':
        args.password = val
        break
      case 'decryptpass':
        args.decryptPass = val.toUpperCase() === 'TRUE' ? 'TRUE' : 'FALSE'
        break
      case 'encryptpass':
        args.encryptPass = val.toUpperCase() === 'TRUE' ? 'TRUE' : 'FALSE'
        break
    }
  }

  return args
}

/**
 * Parse a single FBCSKM line (device + scripts).
 */
function parseLine(line: string) {
  const segments = line.split('|')
  const deviceSeg = segments.shift() || ''
  const fields = deviceSeg.split(',')

  while (fields.length < 10) fields.push('')

  const [name, forcedIp, port, cto, cpoll, username, password, publicKeyPath, privateKeyPath, passphrase] = fields

  const dev: Device = {
    id: uuid(),
    name: name || 'UNKNOWN',
    forcedIp: forcedIp || undefined,
    port: port ? Number(port) : null,
    connectionTimeoutMs: cto ? Number(cto) : null,
    connectionPollSec: cpoll ? Number(cpoll) : null,
    username: username || undefined,
    password: password || undefined,
    publicKeyPath: publicKeyPath || undefined,
    privateKeyPath: privateKeyPath || undefined,
    passphrase: passphrase || undefined,
    scripts: []
  }

  for (const seg of segments) {
    if (!seg.trim()) continue
    const parts = seg.split('*')
    if (parts.length < 2) continue

    const instanceName = parts[0]
    const scriptPath = parts[1]
    const argstrRaw = parts.length >= 3 ? parts[2] : ''

    // Decode protocol placeholders back to raw characters
    const argstr = argstrRaw
      .replace(/<BMC_SEP>/g, '|')
      .replace(/<BMC_STAR>/g, '*')

    const poll = (parts.length >= 4 && parts[3]) ? Number(parts[3]) : undefined
    const tout = (parts.length >= 5 && parts[4]) ? Number(parts[4]) : undefined
    const regex = parts.length >= 6 ? parts[5] : undefined

    const args = parseArgsToStruct(argstr)

    dev.scripts.push({
      id: uuid(),
      instanceName,
      scriptPath,
      args,
      pollIntervalSec: poll,
      timeoutSec: tout,
      regexField: regex
    })
  }

  return dev
}

/**
 * Helper to safely single-quote values in serialized command sections.
 * Escapes internal single quotes with '"'"' (POSIX-safe pattern).
 */
function singleQuote(value: string): string {
  return `'${String(value ?? '').replace(/'/g, `'"'"'`)}'`
}

/**
 * Serialize a device to the FBCSKM line format.
 */
function serializeDevice(dev: Device): string {
  const devSeg = [
    dev.name ?? '',
    dev.forcedIp ?? '',
    dev.port ?? '',
    dev.connectionTimeoutMs ?? '',
    dev.connectionPollSec ?? '',
    dev.username ?? '',
    dev.password ?? '',
    dev.publicKeyPath ?? '',
    dev.privateKeyPath ?? '',
    dev.passphrase ?? ''
  ].join(',')

  const scripts = (dev.scripts ?? []).map(s => {
    const parts: string[] = []
    const a = s.args || {}

    if (a.url) parts.push(`-url ${singleQuote(a.url)}`)
    if (a.method) parts.push(`-method ${a.method}`)
    if (a.outputFormat) parts.push(`-outputFormat ${a.outputFormat}`)
    if (a.payload) parts.push(`-payload ${singleQuote(a.payload)}`)
    if (a.searchKey) parts.push(`-searchKey ${singleQuote(a.searchKey)}`)
    if (a.searchString) parts.push(`-searchString ${singleQuote(a.searchString)}`)
    if (a.matchRegex) parts.push(`-matchRegex ${singleQuote(a.matchRegex)}`)
    if (a.username) parts.push(`-username ${singleQuote(a.username)}`)
    if (a.password) parts.push(`-password ${singleQuote(a.password)}`)
    if (a.decryptPass) parts.push(`-decryptPass ${a.decryptPass}`)
    if (a.encryptPass) parts.push(`-encryptPass ${a.encryptPass}`)

    let cmd = ` ${parts.join(' ')} `
    // Encode reserved separators in args payload
    cmd = cmd.replace(/\|/g, '<BMC_SEP>').replace(/\*/g, '<BMC_STAR>')

    const poll = s.pollIntervalSec ?? ''
    const tout = s.timeoutSec ?? ''
    const reg = s.regexField ?? ''

    return `${s.instanceName}*${s.scriptPath}*${cmd}*${poll}*${tout}*${reg}|`
  })

  return [devSeg, ...scripts].join('|')
}

const slice = createSlice({
  name: 'fbcskm',
  initialState,
  reducers: {
    parseFBCSKM(state, action: PayloadAction<string>) {
      const lines = action.payload
        .split(/\r?\n/)
        .filter(l => l.trim().length > 0)

      state.devices = []
      for (const line of lines) {
        const d = parseLine(line)
        if (d) state.devices.push(d)
      }
    },
    addDevice(state, action: PayloadAction<Device>) {
      state.devices.push(action.payload)
    },
    updateDevice(state, action: PayloadAction<Device>) {
      const i = state.devices.findIndex(d => d.id === action.payload.id)
      if (i >= 0) state.devices[i] = action.payload
    },
    deleteDevice(state, action: PayloadAction<string>) {
      state.devices = state.devices.filter(d => d.id !== action.payload)
    },
    addScript(state, action: PayloadAction<{ deviceId: string, script: ScriptInstance }>) {
      const d = state.devices.find(x => x.id === action.payload.deviceId)
      if (d) d.scripts.push(action.payload.script)
    },
    updateScript(state, action: PayloadAction<{ deviceId: string, script: ScriptInstance }>) {
      const d = state.devices.find(x => x.id === action.payload.deviceId)
      if (!d) return
      const i = d.scripts.findIndex(s => s.id === action.payload.script.id)
      if (i >= 0) d.scripts[i] = action.payload.script
    },
    deleteScript(state, action: PayloadAction<{ deviceId: string, scriptId: string }>) {
      const d = state.devices.find(x => x.id === action.payload.deviceId)
      if (!d) return
      d.scripts = d.scripts.filter(s => s.id !== action.payload.scriptId)
    }
  }
})

export const {
  parseFBCSKM,
  addDevice,
  updateDevice,
  deleteDevice,
  addScript,
  updateScript,
  deleteScript
} = slice.actions

export default slice.reducer
