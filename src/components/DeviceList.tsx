
import React, { useState } from 'react'
import { Button, List, ListItem, ListItemButton, ListItemText, Stack, TextField, Typography, IconButton, Menu, MenuItem } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { useAppDispatch, useAppSelector } from '../store/store'
import { addDevice, deleteDevice } from '../store/fbcskmSlice'
import { v4 as uuid } from 'uuid'

export default function DeviceList({ devices: devicesProp, selectedId, onSelect, onRequestEdit }: { devices?: any[], selectedId?: string|null, onSelect: (id: string|null)=>void, onRequestEdit?: (id: string)=>void }){
  const dispatch = useAppDispatch()
  const devices = devicesProp ?? useAppSelector(s=>s.fbcskm.devices)
  const [name, setName] = useState('')
  const [forcedIp, setForcedIp] = useState('')

  // menu state
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [menuDeviceId, setMenuDeviceId] = useState<string | null>(null)

  const openMenu = (e: React.MouseEvent<HTMLElement>, id: string) => { setMenuAnchor(e.currentTarget); setMenuDeviceId(id) }
  const closeMenu = () => { setMenuAnchor(null); setMenuDeviceId(null) }

  const create = () => {
    if (!name.trim()) return
    dispatch(addDevice({ id: uuid(), name, forcedIp, scripts: [] }))
    setName(''); setForcedIp('')
  }

  const remove = (id: string) => {
    const d = devices.find(x=>x.id===id)
    if (!d) return
    if (!confirm(`Delete device '${d.name}'?`)) return
    dispatch(deleteDevice(id))
    if (selectedId === id) onSelect(null)
  }

  const duplicate = (id: string) => {
    const d = devices.find(x=>x.id===id)
    if (!d) return
    const copy = {
      ...d,
      id: uuid(),
      name: `${d.name} (copy)`,
      scripts: (d.scripts || []).map(s => ({ ...s, id: uuid() }))
    }
    dispatch(addDevice(copy as any))
    onSelect(copy.id)
  }

  const onEdit = (id: string) => {
    onSelect(id)
    if (onRequestEdit) onRequestEdit(id)
  }

  return (
    <Stack spacing={2} sx={{minWidth: 360}}>
      <Typography variant='h6'>Devices</Typography>
      <Stack direction='row' spacing={1}>
        <TextField label='Device name' value={name} onChange={e=>setName(e.target.value)} />
        <TextField label='Forced IP (optional)' value={forcedIp} onChange={e=>setForcedIp(e.target.value)} />
        <Button variant='contained' onClick={create}>Add</Button>
      </Stack>
      <List dense>
        {devices.map((d, idx) => {
          const isSelected = selectedId === d.id
          return (
            <ListItem key={d.id} secondaryAction={
              <IconButton edge='end' onClick={(e)=>openMenu(e, d.id)} aria-label='actions' size='small' sx={{ color: isSelected ? '#fff' : undefined }}>
                <MoreVertIcon />
              </IconButton>
            } sx={{ backgroundColor: isSelected ? '#0b3d91' : (idx % 2 === 1 ? 'rgba(11,61,145,0.08)' : 'transparent') }}>
              <ListItemButton
                selected={isSelected}
                onClick={()=>onSelect(d.id)}
                sx={{ py: 0.5, color: isSelected ? '#fff' : undefined }}
              >
                <ListItemText primary={d.name} secondary={`Scripts: ${d.scripts.length}`} sx={{ '& .MuiListItemText-primary': { color: isSelected ? '#fff' : 'inherit' }, '& .MuiListItemText-secondary': { color: isSelected ? '#fff' : 'inherit' } }} />
              </ListItemButton>
            </ListItem>
          )
        })}
        {devices.length===0 && <Typography color='text.secondary'>No devices.</Typography>}
      </List>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={()=>{ if (menuDeviceId) onEdit(menuDeviceId); closeMenu() }}>Edit</MenuItem>
        <MenuItem onClick={()=>{ if (menuDeviceId) duplicate(menuDeviceId); closeMenu() }}>Duplicate</MenuItem>
        <MenuItem onClick={()=>{ if (menuDeviceId) remove(menuDeviceId); closeMenu() }} sx={{color: 'error.main'}}>Delete</MenuItem>
      </Menu>
    </Stack>
  )
}
