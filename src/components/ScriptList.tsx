
import React, { useState } from 'react'
import { Button, List, ListItem, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../store/store'
import { addScript, deleteScript } from '../store/fbcskmSlice'
import { v4 as uuid } from 'uuid'

export default function ScriptList({ deviceId, selectedId, onSelect }: { deviceId?: string|null, selectedId?: string|null, onSelect: (id: string)=>void }){
  const dispatch = useAppDispatch()
  const dev = useAppSelector(s=>s.fbcskm.devices.find(d=>d.id===deviceId))
  const [instanceName, setInstanceName] = useState('NEW_Script')
  const [scriptPath, setScriptPath] = useState('/myscripts/RestMon.ps1')

  if (!dev) return <Typography color='text.secondary'>Select a device.</Typography>

  const create = () => {
    dispatch(addScript({ deviceId: dev.id, script: { id: uuid(), instanceName, scriptPath, args: { method: 'GET', outputFormat: 'json' }, pollIntervalSec: 300, timeoutSec: 300 } }))
    setInstanceName('NEW_Script'); setScriptPath('/myscripts/RestMon.ps1')
  }
  const remove = (id: string) => dispatch(deleteScript({ deviceId: dev.id, scriptId: id }))

  return (
    <Stack spacing={2} sx={{minWidth: 420}}>
      <Typography variant='h6'>Scripts for: {dev.name}</Typography>
      <Stack direction='row' spacing={1}>
        <TextField label='Instance name' value={instanceName} onChange={e=>setInstanceName(e.target.value)} />
        <TextField label='Script path' value={scriptPath} onChange={e=>setScriptPath(e.target.value)} />
        <Button variant='contained' onClick={create}>Add</Button>
      </Stack>
      <List dense>
        {dev.scripts.map(s=> (
          <ListItem key={s.id} secondaryAction={<Button color='error' onClick={()=>remove(s.id)}>Delete</Button>}>
            <ListItemButton selected={selectedId===s.id} onClick={()=>onSelect(s.id)}>
              <ListItemText primary={s.instanceName} secondary={`${s.args.method || 'GET'} ${s.args.outputFormat || 'json'}`} />
            </ListItemButton>
          </ListItem>
        ))}
        {dev.scripts.length===0 && <Typography color='text.secondary'>No scripts.</Typography>}
      </List>
    </Stack>
  )
}
