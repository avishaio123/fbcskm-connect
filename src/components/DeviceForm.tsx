
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Drawer, Box, Stack, Typography, TextField, Button, Grid } from '@mui/material'
import { Device, updateDevice } from '../store/fbcskmSlice'
import { useAppDispatch, useAppSelector } from '../store/store'

interface Props { open: boolean; device?: Device | null; onClose: ()=>void }

export type DeviceFormHandle = {
  isDirty: () => boolean
  save: () => void
  discard: () => void
}

export default forwardRef<DeviceFormHandle, Props>(function DeviceForm({ open, device, onClose }, ref){
  const dispatch = useAppDispatch()
  const [draft, setDraft] = useState<Device | null>(device ?? null)
  const [shouldClose, setShouldClose] = useState(false)
  useEffect(() => { setDraft(device); if (shouldClose) { setShouldClose(false); onClose() } }, [device])

  useImperativeHandle(ref, () => ({
    // compare draft to the current device in the store rather than the prop to avoid race when saving
    isDirty: () => JSON.stringify(draft) !== JSON.stringify(device),
    // save(closeAfter=true) - when called programmatically pass false to avoid triggering onClose that will re-open the unsaved dialog
    save: (closeAfter: boolean = true) => {
      if (!draft) return false
      if (!draft.name || !draft.name.trim()) { alert('Device Name/IP is required'); return false }
      const withDefaults: Device = { ...draft, port: draft.port ?? 5985, connectionTimeoutMs: draft.connectionTimeoutMs ?? 2000, connectionPollSec: draft.connectionPollSec ?? 60 }
      setDraft(withDefaults)
      dispatch(updateDevice(withDefaults))
      draft.dirty = true
      draft.scripts.forEach(s => s.dirty = false)
      if (closeAfter) setShouldClose(true)
      return true
    },
    discard: () => setDraft(device ?? null)
  }), [draft, device, dispatch, onClose])

  const set = (key: keyof Device, value: any) => { if(!draft) return; setDraft({ ...draft, [key]: value }) }

  const save = () => {
    if (!draft) return
    if (!draft.name || !draft.name.trim()) { alert('Device Name/IP is required'); return }
    const withDefaults: Device = {
      ...draft,
      port: draft.port ?? 5985,
      connectionTimeoutMs: draft.connectionTimeoutMs ?? 2000,
      connectionPollSec: draft.connectionPollSec ?? 60
    }
    setDraft(withDefaults)
    draft.dirty = true
    draft.scripts.forEach(s => s.dirty = false)
    dispatch(updateDevice(withDefaults))
    setShouldClose(true)
  }
  return (
    <Drawer anchor='right' open={open} onClose={onClose}>
      <Box sx={{ width: 520, p:3 }}>
        <Typography variant='h6'>Device Form</Typography>
        {!draft ? <Typography color='text.secondary'>Select a device to edit.</Typography> : (
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid item xs={12}><TextField label='Device Name/IP' fullWidth value={draft.name || ''} onChange={e=>set('name', e.target.value)} /></Grid>
              <Grid item xs={12}><TextField label='Forced IP Address' fullWidth value={draft.forcedIp || ''} onChange={e=>set('forcedIp', e.target.value)} /></Grid>
              <Grid item xs={6}><TextField label='Port' type='number' fullWidth value={draft.port ?? 5985} onChange={e=>set('port', Number(e.target.value))} /></Grid>
              <Grid item xs={6}><TextField label='Connection timeout (ms)' type='number' fullWidth value={draft.connectionTimeoutMs ?? 2000} onChange={e=>set('connectionTimeoutMs', Number(e.target.value))} /></Grid>
              <Grid item xs={6}><TextField label='Connection poll interval (sec)' type='number' fullWidth value={draft.connectionPollSec ?? 60} onChange={e=>set('connectionPollSec', Number(e.target.value))} /></Grid>
              <Grid item xs={6}></Grid>
              <Grid item xs={6}><TextField label='Username' fullWidth value={draft.username || ''} onChange={e=>set('username', e.target.value)} /></Grid>
              <Grid item xs={6}><TextField label='Password' type='password' fullWidth value={draft.password || ''} onChange={e=>set('password', e.target.value)} /></Grid>
              <Grid item xs={12}><TextField label='Public Key Path' fullWidth value={draft.publicKeyPath || ''} onChange={e=>set('publicKeyPath', e.target.value)} /></Grid>
              <Grid item xs={12}><TextField label='Private Key Path' fullWidth value={draft.privateKeyPath || ''} onChange={e=>set('privateKeyPath', e.target.value)} /></Grid>
              <Grid item xs={12}><TextField label='Passphrase' type='password' fullWidth value={draft.passphrase || ''} onChange={e=>set('passphrase', e.target.value)} /></Grid>
            </Grid>
            <Stack direction='row' spacing={1}><Button onClick={onClose}>Cancel</Button><Button variant='contained' onClick={save}>Save Device</Button></Stack>
          </Stack>
        )}
      </Box>
    </Drawer>
  )
})