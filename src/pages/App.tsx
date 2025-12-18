
import React, { useState, useMemo } from 'react'
import { Box, Button, Stack, Typography, TextField, FormControlLabel, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, IconButton } from '@mui/material'
import Viewer from './Viewer'
import DeviceList from '../components/DeviceList'
import ScriptList from '../components/ScriptList'
import ScriptForm from '../components/ScriptForm'
import DeviceForm from '../components/DeviceForm'
import { useAppSelector } from '../store/store'

declare global {
  interface Window {
    electronAPI: { 
      openFile: (filter?: any) => Promise<string|null>
      saveFile: (suggested: string) => Promise<string|null>
      readFile: (filePath: string) => Promise<string>
      writeFile: (filePath: string, content: string) => Promise<boolean>
      rotateBackups: (filePath: string) => Promise<boolean>
    }
  }
}

import ErrorBoundary from '../components/ErrorBoundary'

export default function App(){
  // Global error logging to help capture runtime issues in dev
  React.useEffect(()=>{
    const onErr = (ev: any) => { console.error('window.onerror', ev) }
    const onRej = (ev: any) => { console.error('unhandledrejection', ev) }
    window.addEventListener('error', onErr)
    window.addEventListener('unhandledrejection', onRej)
    return () => { window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onRej) }
  }, [])

  const [filePath, setFilePath] = useState<string | null>(null)
  const [raw, setRaw] = useState<string>('')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null)
  const [deviceFormOpen, setDeviceFormOpen] = useState(false)

  // Unsaved changes dialog state
  const [unsavedOpen, setUnsavedOpen] = useState(false)
  const unsavedActionRef = React.useRef<() => void | null>(null)
  const currentUnsavedTargetRef = React.useRef<{type:'device'|'script'|'closeDeviceForm', payload?: any } | null>(null)

  // Search state
  const [searchText, setSearchText] = useState('')
  const [searchInScripts, setSearchInScripts] = useState(true) // default checked

  const devices = useAppSelector(s=>s.fbcskm.devices)

  const openFile = async () => {
    const p = await window.electronAPI.openFile()
    if (!p) return
    const txt = await window.electronAPI.readFile(p)
    setFilePath(p)
    setRaw(txt)
  }

  const filteredDevices = useMemo(() => {
    const q = (searchText || '').trim().toLowerCase()
    if (!q) return devices
    return devices.filter(d => {
      if ((d.name || '').toLowerCase().includes(q)) return true
      if (!searchInScripts) return false
      for (const s of d.scripts || []) {
        if ((s.instanceName || '').toLowerCase().includes(q)) return true
        if ((s.scriptPath || '').toLowerCase().includes(q)) return true
        if (JSON.stringify(s.args || {}).toLowerCase().includes(q)) return true
      }
      return false
    })
  }, [devices, searchText, searchInScripts])

  // Refs to forms to check dirty state and call save/discard programmatically
  const scriptFormRef = React.useRef<any>(null)
  const deviceFormRef = React.useRef<any>(null)
  const dirtyFormTypeRef = React.useRef<'script'|'device'|null>(null)

  const requestSelectDevice = (id: string|null) => {
    // If switching to same device, allow
    if (id === selectedDeviceId) { setSelectedDeviceId(id); return }

    // If a script is being edited and dirty, prompt first
    if (selectedScriptId && scriptFormRef.current && scriptFormRef.current.isDirty && scriptFormRef.current.isDirty()){
      dirtyFormTypeRef.current = 'script'
      currentUnsavedTargetRef.current = { type: 'device', payload: { id } }
      unsavedActionRef.current = () => { setSelectedDeviceId(id); setSelectedScriptId(null) }
      setUnsavedOpen(true)
      return
    }

    // If device form is open and dirty, prompt
    if (deviceFormOpen && deviceFormRef.current && deviceFormRef.current.isDirty && deviceFormRef.current.isDirty()){
      dirtyFormTypeRef.current = 'device'
      currentUnsavedTargetRef.current = { type: 'device', payload: { id } }
      unsavedActionRef.current = () => { setSelectedDeviceId(id); setSelectedScriptId(null) }
      setUnsavedOpen(true)
      return
    }

    // No dirty state, proceed
    setSelectedDeviceId(id)
    setSelectedScriptId(null)
  }

  const requestOpenDeviceForm = (id: string|null) => {
    // Selecting a device and opening its form — guard as above
    if (id !== selectedDeviceId) {
      requestSelectDevice(id)
      // If there were no dirty blockers then the selection happened and we can open immediately
      if (!unsavedOpen) setDeviceFormOpen(true)
    } else {
      // same device - just open
      setDeviceFormOpen(true)
    }
  }

  const requestSelectScript = (scriptId: string | null, deviceId?: string | null) => {
    // If selecting same script, nothing
    if (scriptId === selectedScriptId) { setSelectedScriptId(scriptId); return }

    if (scriptFormRef.current && scriptFormRef.current.isDirty && scriptFormRef.current.isDirty()){
      dirtyFormTypeRef.current = 'script'
      currentUnsavedTargetRef.current = { type: 'script', payload: { scriptId, deviceId } }
      unsavedActionRef.current = () => { if (deviceId) setSelectedDeviceId(deviceId); setSelectedScriptId(scriptId) }
      setUnsavedOpen(true)
      return
    }

    setSelectedDeviceId(deviceId || null)
    setSelectedScriptId(scriptId)
  }

  const handleDeviceFormClose = () => {
    if (deviceFormRef.current && deviceFormRef.current.isDirty && deviceFormRef.current.isDirty()){
      dirtyFormTypeRef.current = 'device'
      currentUnsavedTargetRef.current = { type: 'closeDeviceForm' }
      unsavedActionRef.current = () => setDeviceFormOpen(false)
      setUnsavedOpen(true)
      return
    }
    setDeviceFormOpen(false)
  }

  const handleUnsavedSave = () => {
    // First save programmatically (device save avoids auto-close to prevent re-check loops)
    if (dirtyFormTypeRef.current === 'script' && scriptFormRef.current && scriptFormRef.current.save){
      scriptFormRef.current.save()
    } else if (dirtyFormTypeRef.current === 'device' && deviceFormRef.current && deviceFormRef.current.save){
      // pass false to avoid calling onClose inside the device form which would re-trigger the unsaved check
      deviceFormRef.current.save(false)
    }

    // then perform pending action (select / close)
    if (unsavedActionRef.current) { unsavedActionRef.current(); unsavedActionRef.current = null }

    // finally close dialog and clear refs
    setUnsavedOpen(false)
    dirtyFormTypeRef.current = null
    currentUnsavedTargetRef.current = null
  }

  const handleUnsavedDiscard = () => {
    setUnsavedOpen(false)
    if (dirtyFormTypeRef.current === 'script' && scriptFormRef.current && scriptFormRef.current.discard){
      scriptFormRef.current.discard()
    } else if (dirtyFormTypeRef.current === 'device' && deviceFormRef.current && deviceFormRef.current.discard){
      deviceFormRef.current.discard()
    }
    if (unsavedActionRef.current) { unsavedActionRef.current(); unsavedActionRef.current = null }
    dirtyFormTypeRef.current = null
    currentUnsavedTargetRef.current = null
  }

  const handleUnsavedCancel = () => {
    setUnsavedOpen(false)
    unsavedActionRef.current = null
    currentUnsavedTargetRef.current = null
    dirtyFormTypeRef.current = null
  }

  return (
    <ErrorBoundary>
    <Stack spacing={2} sx={{py: 3}}>
      <Typography variant='h4'>FBCSKM Manager (CRUD, restmon only)</Typography>

      <Box>
        <Button variant='contained' onClick={openFile}>Open FBCSKM file</Button>
        {filePath && <Typography sx={{ml:2}} component='span'>{filePath}</Typography>}
      </Box>

      <Stack direction='row' spacing={1}>
        <Button variant='outlined' onClick={async ()=>{
          if(!filePath) return
          const { store } = await import('../store/store')
          const { serializeDevices } = await import('../services/serializer')
          const text = serializeDevices(store.getState().fbcskm.devices)
          await window.electronAPI.rotateBackups(filePath)
          await window.electronAPI.writeFile(filePath, text)
          alert('Saved with backup rotation (30 generations).')
        }}>Save in place</Button>
        <Button variant='outlined' onClick={async ()=>{
          const suggested = filePath || 'config.txt'
          const saveTo = await window.electronAPI.saveFile(suggested)
          if(!saveTo) return
          const { store } = await import('../store/store')
          const { serializeDevices } = await import('../services/serializer')
          const text = serializeDevices(store.getState().fbcskm.devices)
          await window.electronAPI.writeFile(saveTo, text)
          alert('Exported file saved.')
        }}>Export as...</Button>
      </Stack>

      <Viewer raw={raw} onRawChange={setRaw} />

      {/* Search area */}
      <Stack direction='row' spacing={1} alignItems='center'>
        <TextField
          placeholder='Search devices...'
          value={searchText}
          onChange={e=>setSearchText(e.target.value)}
          size='small'
          sx={{minWidth: 300}}
          InputProps={{
            endAdornment: searchText ? (
              <InputAdornment position='end'>
                <IconButton size='small' edge='end' aria-label='clear search' onClick={() => setSearchText('')}>
                  ✕
                </IconButton>
              </InputAdornment>
            ) : undefined
          }}
        />
        <FormControlLabel control={<Checkbox checked={searchInScripts} onChange={e=>setSearchInScripts(e.target.checked)} />} label='Include scripts' />
        <Button variant='contained' onClick={()=>{ /* explicit search button — filtering is live */ }}>Search</Button>
      </Stack>

      {/* One clean device list — scripts shown on selection */}
      <Stack direction='row' spacing={2}>
        <DeviceList devices={filteredDevices} selectedId={selectedDeviceId} onSelect={(id:any)=>requestSelectDevice(id)} onRequestEdit={(id)=>{ requestSelectDevice(id); setDeviceFormOpen(true) }} />
        <ScriptList deviceId={selectedDeviceId} selectedId={selectedScriptId} searchText={searchText} searchInScripts={searchInScripts} onSelect={(id:any)=>requestSelectScript(id, selectedDeviceId)} onRequestEdit={(scriptId, deviceId)=>{ requestSelectScript(scriptId, deviceId); }} onSelectScript={(scriptId, deviceId)=>{ requestSelectScript(scriptId, deviceId) }} />
      </Stack>

      {(() => {
        const d = devices.find(x=>x.id===selectedDeviceId)
        if (!d) return null
        const s = d.scripts.find(x=>x.id===selectedScriptId)
        if (!s) return null
        return <ScriptForm ref={scriptFormRef} device={d} script={s} onChange={()=>{}} />
      })()}

      <DeviceForm ref={deviceFormRef} open={deviceFormOpen} device={devices.find(x=>x.id===selectedDeviceId) || null} onClose={handleDeviceFormClose} />

      {/* Unsaved changes dialog */}
      <Dialog open={unsavedOpen} onClose={handleUnsavedCancel}>
        <DialogTitle>Unsaved changes</DialogTitle>
        <DialogContent>
          <Typography>You have unsaved changes. Do you want to save them or discard?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUnsavedCancel}>Cancel</Button>
          <Button color='error' onClick={handleUnsavedDiscard}>Discard Changes</Button>
          <Button variant='contained' onClick={handleUnsavedSave}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Stack>
    </ErrorBoundary>
  )
}
