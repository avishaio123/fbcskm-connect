
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Box, Button, Grid, MenuItem, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Checkbox, FormControlLabel } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { Device, ScriptInstance, updateScript } from '../store/fbcskmSlice'
import { useAppDispatch } from '../store/store'

export type ScriptFormHandle = {
  isDirty: () => boolean
  save: () => void
  discard: () => void
}

export default forwardRef<ScriptFormHandle, { device: Device, script: ScriptInstance, onChange: (s: ScriptInstance) => void }>(
  function ScriptForm({ device, script, onChange }, ref) {
  const dispatch = useAppDispatch()
  const [draft, setDraft] = useState<ScriptInstance>(script)
  const [dryRunOpen, setDryRunOpen] = useState(false)
  const [dryRunResults, setDryRunResults] = useState<{ command: string, results: string } | null>(null)

  // Keep local draft in sync when the parent selects a different script
  useEffect(() => {
    setDraft(script)
  }, [script])

  useImperativeHandle(ref, () => ({
    isDirty: () => JSON.stringify(draft) !== JSON.stringify(script),
    save: () => { dispatch(updateScript({ deviceId: device.id, script: draft })); onChange(draft) },
    discard: () => setDraft(script)
  }), [draft, script, device, dispatch, onChange])

  const set = (path: string, value: any) => {
    setDraft(prev => {
      const next = { ...prev, args: typeof prev.args === 'string' ? prev.args : { ...prev.args } }
      if (path.startsWith('args.')) {
        const key = path.substring(5) as keyof typeof next.args
          ; (next.args as any)[key] = value
      } else if (path === 'instanceName') next.instanceName = value
      else if (path === 'scriptPath') next.scriptPath = value
      else if (path === 'poll') next.pollIntervalSec = Number(value)
      else if (path === 'timeout') next.timeoutSec = Number(value)
      else if (path === 'regexField') next.regexField = value
      return next
    })
  }

  const encodedPreview = (() => {
    if (!draft.isRestmon) return draft.args || ''
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
      <FormControlLabel control={<Checkbox checked={draft.isRestmon ?? false} onChange={e => setDraft(prev => ({ ...prev, isRestmon: e.target.checked }))} />} label="Is Restmon Script" />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField label='Instance Name' fullWidth value={draft.instanceName} onChange={e => set('instanceName', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField label='Script Path' fullWidth value={draft.scriptPath} onChange={e => set('scriptPath', e.target.value)} />
        </Grid>
        {draft.isRestmon ? (
          <>
            <Grid item xs={12} md={6}>
              <TextField label='Method' select fullWidth value={draft.args.method || 'GET'} onChange={e => set('args.method', e.target.value)}>
                <MenuItem value='GET'>GET</MenuItem>
                <MenuItem value='POST'>POST</MenuItem>
                <MenuItem value='PUT'>PUT</MenuItem>
                <MenuItem value='PATCH'>PATCH</MenuItem>
                <MenuItem value='DELETE'>DELETE</MenuItem>
                <MenuItem value='HEAD'>HEAD</MenuItem>
                <MenuItem value='OPTIONS'>OPTIONS</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label='Output Format' select fullWidth value={draft.args.outputFormat || 'json'} onChange={e => set('args.outputFormat', e.target.value)}>
                <MenuItem value='json'>json</MenuItem>
                <MenuItem value='xml'>xml</MenuItem>
                <MenuItem value='text'>text</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField label='URL' fullWidth value={draft.args.url || ''} onChange={e => set('args.url', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label='Payload (POST only)' fullWidth value={draft.args.payload || ''} onChange={e => set('args.payload', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label='Regex Match' fullWidth value={draft.args.matchRegex || ''} onChange={e => set('args.matchRegex', e.target.value.replace(/[‘’“”]/g, "'"))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField label='Poll (sec)' type='number' fullWidth value={draft.pollIntervalSec || 300} onChange={e => set('poll', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField label='Timeout (sec)' type='number' fullWidth value={draft.timeoutSec || 300} onChange={e => set('timeout', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label='Username' fullWidth value={draft.args.username || ''} onChange={e => set('args.username', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <TextField label='Password' type='password' fullWidth value={draft.args.password || ''} onChange={e => set('args.password', e.target.value)} />
                <Button size='small' variant='outlined'
                  onClick={async () => {
                    const pw = draft.args.password || '';
                    if (!pw) { alert('Enter a password to encrypt'); return; }

                    try {
                      // 1) UTF‑16LE bytes of the password (NO null terminator)
                      const pwBytes = new Uint8Array(pw.length * 2);
                      for (let i = 0; i < pw.length; i++) {
                        const code = pw.charCodeAt(i);
                        pwBytes[i * 2] = code & 0xFF;        // little-endian
                        pwBytes[i * 2 + 1] = code >> 8;
                      }

                      // 2) 32-byte key = (1..32)
                      const keyBytes = new Uint8Array(32);
                      for (let i = 0; i < 32; i++) keyBytes[i] = i + 1;
                      const key = await crypto.subtle.importKey(
                        'raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt']
                      );

                      // 3) Random 16-byte IV
                      const iv = crypto.getRandomValues(new Uint8Array(16));

                      // 4) Encrypt (AES-CBC, PKCS#7 padding)
                      const ctBuf = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, pwBytes);
                      const ct = new Uint8Array(ctBuf);

                      // 5) Build V2 package: HEADER + base64( UTF-16LE("2|<IV-b64>|<cipher-hex>") )
                      const HEADER = '76492d1116743f0423413b16050a5345'; // SecureStringExportHeader

                      // IV → Base64
                      const ivB64 = btoa(String.fromCharCode(...iv));

                      // Ciphertext → lowercase hex
                      const cipherHex = Array.from(ct).map(b => b.toString(16).padStart(2, '0')).join('');

                      // "2|<IV>|<HEX>"
                      const pkg = `2|${ivB64}|${cipherHex}`;

                      // UTF‑16LE encode the package string
                      const pkgUtf16 = new Uint8Array(pkg.length * 2);
                      for (let i = 0; i < pkg.length; i++) {
                        const code = pkg.charCodeAt(i);
                        pkgUtf16[i * 2] = code & 0xFF;
                        pkgUtf16[i * 2 + 1] = code >> 8;
                      }

                      // Base64 encode UTF‑16LE bytes
                      let b64Input = '';
                      for (let i = 0; i < pkgUtf16.length; i++) b64Input += String.fromCharCode(pkgUtf16[i]);
                      const encoded = btoa(b64Input);

                      const finalString = HEADER + encoded;

                      set('args.password', finalString);
                      set('args.decryptPass', 'TRUE');
                    } catch (e) {
                      console.error('Encryption failed', e);
                    }
                  }}>Encrypt Pass</Button>
              </div>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label='Decrypt Pass' select fullWidth value={draft.args.decryptPass || 'FALSE'} onChange={e => set('args.decryptPass', e.target.value)}>
                <MenuItem value='TRUE'>TRUE</MenuItem>
                <MenuItem value='FALSE'>FALSE</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField label='Trailing regex field (FBCSKM slot)' fullWidth value={draft.regexField || ''} onChange={e => set('regexField', e.target.value)} />
            </Grid>
          </>
        ) : (
          <Grid item xs={12}>
            <TextField label='Arguments' fullWidth multiline value={draft.args || ''} onChange={e => setDraft(prev => ({ ...prev, args: e.target.value }))} />
          </Grid>
        )}
        <Grid item xs={12}>
          <TextField label={draft.isRestmon ? 'Encoded Command Preview' : 'Arguments Preview'} fullWidth multiline minRows={2} value={encodedPreview} InputProps={{ readOnly: true }} />
        </Grid>
      </Grid>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant='contained' sx={{ backgroundColor: 'white', color: 'black' }} onClick={() => {
          const cmd = draft.scriptPath + (draft.isRestmon ? encodedPreview : (' ' + (draft.args || '')))
          const results = '(placeholder - command not executed)'
          setDryRunResults({ command: cmd, results })
          setDryRunOpen(true)
        }}>Dry Run</Button>
        <Button variant='contained' onClick={save}>Save Script</Button>
      </Box>

      <Dialog open={dryRunOpen} onClose={() => setDryRunOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>Dry Run Results</DialogTitle>
        <DialogContent>
          {dryRunResults && (
            <>
              <Box sx={{ position: 'relative', mb: 2 }}>
                <Typography variant='h6'>Command</Typography>
                <IconButton sx={{ position: 'absolute', top: 0, right: 0 }} onClick={() => navigator.clipboard.writeText(dryRunResults.command)}>
                  <ContentCopyIcon />
                </IconButton>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                  {dryRunResults.command}
                </pre>
              </Box>
              <Box sx={{ position: 'relative' }}>
                <Typography variant='h6'>Results</Typography>
                <IconButton sx={{ position: 'absolute', top: 0, right: 0 }} onClick={() => navigator.clipboard.writeText(dryRunResults.results)}>
                  <ContentCopyIcon />
                </IconButton>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                  {dryRunResults.results.split('\n').map((line, i) => {
                    if (line.toLowerCase().includes('error')) return <span key={i} style={{ color: 'red' }}>{line}\n</span>
                    if (line.toLowerCase().includes('warn')) return <span key={i} style={{ color: 'orange' }}>{line}\n</span>
                    return <span key={i}>{line}\n</span>
                  })}
                </pre>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDryRunOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
})
