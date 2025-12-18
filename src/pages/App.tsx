
import React, { useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import Dashboard from './Dashboard'
import Viewer from './Viewer'
import DeviceList from '../components/DeviceList'
import ScriptList from '../components/ScriptList'
import ScriptForm from '../components/ScriptForm'
import DeviceForm from '../components/DeviceForm'
import { useAppSelector } from '../store/store'

declare global {
  interface Window {
    // FIX 1: Change 'api' to 'electronAPI'
    electronAPI: { 
      // FIX 2: Change 'openFileDialog' to 'openFile'
      openFile: (filter?: any) => Promise<string|null> 
      // FIX 3: Change 'saveFileDialog' to 'saveFile'
      saveFile: (suggested: string) => Promise<string|null> 
      readFile: (filePath: string) => Promise<string>
      writeFile: (filePath: string, content: string) => Promise<boolean>
      // 'rotateBackups' in preload.js, 'rotate' in App.tsx. Let's fix this too.
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
  const devices = useAppSelector(s=>s.fbcskm.devices)

//  const openFile = async () => {
//    const p = await window.api.openFileDialog()
//    if (!p) return
//    const txt = await window.api.readFile(p)
//    setFilePath(p)
//    setRaw(txt)
//  }

  const openFile = async () => {
    // FIX 4: Use window.electronAPI.openFile
    const p = await window.electronAPI.openFile() 
    if (!p) return
    const txt = await window.electronAPI.readFile(p)
    setFilePath(p)
    setRaw(txt)
  }
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
          //await window.api.rotate(filePath)
          await window.electronAPI.rotateBackups(filePath)

          //await window.api.writeFile(filePath, text)
          await window.electronAPI.writeFile(filePath, text)

          alert('Saved with backup rotation (30 generations).')
        }}>Save in place</Button>
        <Button variant='outlined' onClick={async ()=>{
          const suggested = filePath || 'config.txt'
          
          //const saveTo = await window.api.saveFileDialog(suggested)
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
      <Dashboard />
      <Stack direction='row' spacing={2}>
        <DeviceList selectedId={selectedDeviceId} onSelect={setSelectedDeviceId as any} />
        <ScriptList deviceId={selectedDeviceId} selectedId={selectedScriptId} onSelect={setSelectedScriptId as any} />
      </Stack>
      <Stack direction='row' spacing={1}>
        <Button variant='outlined' disabled={!selectedDeviceId} onClick={()=>setDeviceFormOpen(true)}>Edit Device</Button>
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
