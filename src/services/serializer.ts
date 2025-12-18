
import { Device } from '../store/fbcskmSlice'

/**
 * Safely wrap a value in single quotes for shell-like serialization.
 * Escapes internal single quotes with '\'' (POSIX-safe via '"'"').
 */
function singleQuote(value: string): string {
  return `'${String(value ?? '').replace(/'/g, `'"'"'`)}'`
}

/**
 * Replace reserved characters with protocol tokens.
 */
function encodeSpecials(s: string): string {
  return s
    .replace(/\|/g, '<BMC_SEP>')
    .replace(/\*/g, '<BMC_STAR>')
}

/**
 * Convert an args struct to a flat string of CLI-like flags.
 */
function structToArgString(args: any): string {
  if (!args || typeof args !== 'object') return ' '

  const parts: string[] = []

  if (args.url) parts.push(`-url ${singleQuote(args.url)}`)
  if (args.method) parts.push(`-method ${args.method}`)
  if (args.outputFormat) parts.push(`-outputFormat ${args.outputFormat}`)
  if (args.payload) parts.push(`-payload ${singleQuote(args.payload)}`)
  if (args.searchKey) parts.push(`-searchKey ${singleQuote(args.searchKey)}`)
  if (args.searchString) parts.push(`-searchString ${singleQuote(args.searchString)}`)
  if (args.matchRegex) parts.push(`-matchRegex ${singleQuote(args.matchRegex)}`)
  if (args.username) parts.push(`-username ${singleQuote(args.username)}`)
  if (args.password) parts.push(`-password ${singleQuote(args.password)}`)
  if (args.decryptPass) parts.push(`-decryptPass ${args.decryptPass}`)
  if (args.encryptPass) parts.push(`-encryptPass ${args.encryptPass}`)

  let s = parts.join(' ')
  s = encodeSpecials(s)
  return parts.length ? ` ${s} ` : ' '
}

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

  const scripts = (dev.scripts ?? []).map((s) => {
    const argsStr = structToArgString(s?.args)
    const poll = s?.pollIntervalSec ?? ''
    const tout = s?.timeoutSec ?? ''
    const reg = s?.regexField ?? ''
    const instanceName = s?.instanceName ?? ''
    const scriptPath = s?.scriptPath ?? ''

    return `${instanceName}*${scriptPath}*${argsStr}*${poll}*${tout}*${reg}|`
  })

  return [devSeg, ...scripts].join('|')
}

export function serializeDevices(devices: Device[]): string {
  return (devices ?? []).map(serializeDevice).join('\n')
}
