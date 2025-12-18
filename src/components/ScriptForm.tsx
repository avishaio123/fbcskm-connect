
import React, { useState } from 'react'
import { Box, Button, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { Device, ScriptInstance, updateScript } from '../store/fbcskmSlice'
import { useAppDispatch } from '../store/store'

export default function ScriptForm({ device, script, onChange }: { device: Device, script: ScriptInstance, onChange: (s: ScriptInstance)=>void }){
  const dispatch = useAppDispatch()
  const [draft, setDraft] = useState<ScriptInstance>(script)

  const set = (path: string, value: any) => {
    setDraft(prev => {
      const next = { ...prev, args: { ...prev.args } }
      if (path.startsWith('args.')) {
        const key = path.substring(5) as keyof typeof next.args
        ;(next.args as any)[key] = value
      } else if (path === 'instanceName') next.instanceName = value
      else if (path === 'scriptPath') next.scriptPath = value
      else if (path === 'poll') next.pollIntervalSec = Number(value)
      else if (path === 'timeout') next.timeoutSec = Number(value)
      else if (path === 'regexField') next.regexField = value
      return next
    })
  }

  const encodedPreview = (() => {
    const parts: string[] = []
    const a = draft.args || {}
    if (a.url) parts.push(`-url '${a.url}'`)
    if (a.method) parts.push(`-method ${a.method}`)
    if (a.outputFormat) parts.push(`-outputFormat ${a.outputFormat}`)
    if (a.payload) parts.push(`-payload '${a.payload}'`)
    if (a.searchKey) parts.push(`-searchKey '${a.searchKey}'`)
    if (a.searchString) parts.push(`-searchString '${a.searchString}'`)
    if (a.matchRegex) parts.push(`-matchRegex '${a.matchRegex}'`)
    if (a.username) parts.push(`-username '${a.username}'`)
    if (a.password) parts.push(`-password '${a.password}'`)
    if (a.decryptPass) parts.push(`-decryptPass ${a.decryptPass}`)
    if (a.encryptPass) parts.push(`-encryptPass ${a.encryptPass}`)
    let cmd = ' ' + parts.join(' ') + ' '
    cmd = cmd.replace(/\|/g, '<BMC_SEP>').replace(/\*/g, '<BMC_STAR>')
    return cmd
  })()

  const save = () => {
    dispatch(updateScript({ deviceId: device.id, script: draft }))
    onChange(draft)
  }

  return (
    <Stack spacing={2}>
      <Typography variant='h6'>Edit Script</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField label='Instance Name' fullWidth value={draft.instanceName} onChange={e=>set('instanceName', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField label='Script Path' fullWidth value={draft.scriptPath} onChange={e=>set('scriptPath', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField label='Method' select fullWidth value={draft.args.method || 'GET'} onChange={e=>set('args.method', e.target.value)}>
            <MenuItem value='GET'>GET</MenuItem>
            <MenuItem value='POST'>POST</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField label='Output Format' select fullWidth value={draft.args.outputFormat || 'json'} onChange={e=>set('args.outputFormat', e.target.value)}>
            <MenuItem value='json'>json</MenuItem>
            <MenuItem value='xml'>xml</MenuItem>
            <MenuItem value='text'>text</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField label='URL' fullWidth value={draft.args.url || ''} onChange={e=>set('args.url', e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <TextField label='Payload (POST only)' fullWidth value={draft.args.payload || ''} onChange={e=>set('args.payload', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField label='Regex Match' fullWidth value={draft.args.matchRegex || ''} onChange={e=>set('args.matchRegex', e.target.value.replace(/[‘’“”]/g, "'"))} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField label='Poll (sec)' type='number' fullWidth value={draft.pollIntervalSec || 300} onChange={e=>set('poll', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField label='Timeout (sec)' type='number' fullWidth value={draft.timeoutSec || 300} onChange={e=>set('timeout', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField label='Username' fullWidth value={draft.args.username || ''} onChange={e=>set('args.username', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField label='Password' type='password' fullWidth value={draft.args.password || ''} onChange={e=>set('args.password', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField label='Decrypt Pass' select fullWidth value={draft.args.decryptPass || 'FALSE'} onChange={e=>set('args.decryptPass', e.target.value)}>
            <MenuItem value='TRUE'>TRUE</MenuItem>
            <MenuItem value='FALSE'>FALSE</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField label='Encrypt Pass' select fullWidth value={draft.args.encryptPass || 'FALSE'} onChange={e=>set('args.encryptPass', e.target.value)}>
            <MenuItem value='TRUE'>TRUE</MenuItem>
            <MenuItem value='FALSE'>FALSE</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField label='Trailing regex field (FBCSKM slot)' fullWidth value={draft.regexField || ''} onChange={e=>set('regexField', e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <TextField label='Encoded Command Preview' fullWidth multiline minRows={2} value={encodedPreview} InputProps={{ readOnly: true }} />
        </Grid>
      </Grid>
      <Box>
        <Button variant='contained' onClick={save}>Save Script</Button>
      </Box>
    </Stack>
  )
}
