
import React, { useState } from 'react'
import { Button, List, ListItem, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../store/store'
import { addDevice, deleteDevice } from '../store/fbcskmSlice'
import { v4 as uuid } from 'uuid'

export default function DeviceList({ selectedId, onSelect }: { selectedId?: string|null, onSelect: (id: string)=>void }){
  const dispatch = useAppDispatch()
  const devices = useAppSelector(s=>s.fbcskm.devices)
  const [name, setName] = useState('')
  const [forcedIp, setForcedIp] = useState('')

  const create = () => {
    if (!name.trim()) return
    dispatch(addDevice({ id: uuid(), name, forcedIp, scripts: [] }))
    setName(''); setForcedIp('')
  }
  const remove = (id: string) => dispatch(deleteDevice(id))

  return (
    <Stack spacing={2} sx={{minWidth: 360}}>
      <Typography variant='h6'>Devices</Typography>
      <Stack direction='row' spacing={1}>
        <TextField label='Device name' value={name} onChange={e=>setName(e.target.value)} />
        <TextField label='Forced IP (optional)' value={forcedIp} onChange={e=>setForcedIp(e.target.value)} />
        <Button variant='contained' onClick={create}>Add</Button>
      </Stack>
      <List dense>
        {devices.map(d=> (
          <ListItem key={d.id} secondaryAction={<Button color='error' onClick={()=>remove(d.id)}>Delete</Button>}>
            <ListItemButton selected={selectedId===d.id} onClick={()=>onSelect(d.id)}>
              <ListItemText primary={d.name} secondary={`Scripts: ${d.scripts.length}`} />
            </ListItemButton>
          </ListItem>
        ))}
        {devices.length===0 && <Typography color='text.secondary'>No devices.</Typography>}
      </List>
    </Stack>
  )
}
