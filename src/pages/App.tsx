
import React, { useState, useMemo } from 'react'
import { Box, Button, Stack, Typography, TextField, FormControlLabel, Checkbox } from '@mui/material'
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

export default function App(){
  const [filePath, setFilePath] = useState<string | null>(null)
  const [raw, setRaw] = useState<string>('')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null)
  const [deviceFormOpen, setDeviceFormOpen] = useState(false)

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

  return (
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
        <TextField placeholder='Search devices...' value={searchText} onChange={e=>setSearchText(e.target.value)} size='small' sx={{minWidth: 300}} />
        <FormControlLabel control={<Checkbox checked={searchInScripts} onChange={e=>setSearchInScripts(e.target.checked)} />} label='Include scripts' />
        <Button variant='contained' onClick={()=>{ /* explicit search button — filtering is live */ }}>Search</Button>
      </Stack>

      {/* One clean device list — scripts shown on selection */}
      <Stack direction='row' spacing={2}>
        <DeviceList devices={filteredDevices} selectedId={selectedDeviceId} onSelect={setSelectedDeviceId as any} onRequestEdit={(id)=>{ setSelectedDeviceId(id); setDeviceFormOpen(true) }} />
        <ScriptList deviceId={selectedDeviceId} selectedId={selectedScriptId} onSelect={(id:any)=>setSelectedScriptId(id)} onRequestEdit={(scriptId, deviceId)=>{ setSelectedDeviceId(deviceId); setSelectedScriptId(scriptId) }} onSelectScript={(scriptId, deviceId)=>{ setSelectedDeviceId(deviceId); setSelectedScriptId(scriptId) }} />
      </Stack>

      {(() => {
        const d = devices.find(x=>x.id===selectedDeviceId)
        if (!d) return null
        const s = d.scripts.find(x=>x.id===selectedScriptId)
        if (!s) return null
        return <ScriptForm device={d} script={s} onChange={()=>{}} />
      })()}

      <DeviceForm open={deviceFormOpen} device={devices.find(x=>x.id===selectedDeviceId) || null} onClose={()=>setDeviceFormOpen(false)} />
    </Stack>
  )
}
