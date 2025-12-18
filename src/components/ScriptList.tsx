
import React, { useState } from 'react'
import { Button, Box, List, ListItem, ListItemButton, ListItemText, Stack, TextField, Typography, IconButton, Menu, MenuItem } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { useAppDispatch, useAppSelector } from '../store/store'
import { addScript, deleteScript } from '../store/fbcskmSlice'
import { v4 as uuid } from 'uuid'

export default function ScriptList({ deviceId, selectedId, onSelect, onRequestEdit, onSelectScript, searchText, searchInScripts, onCopyScript, onCutScript }: { deviceId?: string|null, selectedId?: string|null, onSelect: (id: string|null)=>void, onRequestEdit?: (id: string, deviceId: string)=>void, onSelectScript?: (id: string, deviceId: string)=>void, searchText?: string, searchInScripts?: boolean, onCopyScript?: (id:string, deviceId:string)=>void, onCutScript?: (id:string, deviceId:string)=>void }){
  const dispatch = useAppDispatch()
  const dev = useAppSelector(s=>s.fbcskm.devices.find(d=>d.id===deviceId))
  const q = (searchText || '').trim().toLowerCase()
  // When searching inside scripts, only show scripts that match for the selected device
  const shownScripts = dev ? ((q && searchInScripts) ? dev.scripts.filter(s => {
    if ((s.instanceName || '').toLowerCase().includes(q)) return true
    if ((s.scriptPath || '').toLowerCase().includes(q)) return true
    if (JSON.stringify(s.args || {}).toLowerCase().includes(q)) return true
    return false
  }) : dev.scripts) : []
  const [instanceName, setInstanceName] = useState('NEW_Script')
  const [scriptPath, setScriptPath] = useState('/myscripts/RestMon.ps1')

  // menu state
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [menuScriptId, setMenuScriptId] = useState<string | null>(null)

  const openMenu = (e: React.MouseEvent<HTMLElement>, id: string) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuScriptId(id) }
  const closeMenu = () => { setMenuAnchor(null); setMenuScriptId(null) }

  const onEdit = (id: string) => {
    // ensure parent knows which device the script belongs to so App can render the ScriptForm
    onSelect(id)
    if (onRequestEdit && deviceId) onRequestEdit(id, deviceId)
  }

  if (!dev) return <Typography color='text.secondary'>Select a device.</Typography>

  const create = () => {
    dispatch(addScript({ deviceId: dev.id, script: { id: uuid(), instanceName, scriptPath, args: { method: 'GET', outputFormat: 'json' }, pollIntervalSec: 300, timeoutSec: 300 } }))
    setInstanceName('NEW_Script'); setScriptPath('/myscripts/RestMon.ps1')
  }

  const remove = (id: string) => {
    const s = dev.scripts.find(x=>x.id===id)
    if (!s) return
    if (!confirm(`Delete script '${s.instanceName}'?`)) return
    dispatch(deleteScript({ deviceId: dev.id, scriptId: id }))
    if (selectedId === id) onSelect(null)
  }

  const duplicate = (id: string) => {
    const s = dev.scripts.find(x=>x.id===id)
    if (!s) return
    const copy = { ...s, id: uuid(), instanceName: `${s.instanceName} (copy)` }
    dispatch(addScript({ deviceId: dev.id, script: copy }))
    onSelect(copy.id)
  }

  return (
    <Stack spacing={2} sx={{minWidth: 420}}>
      <Typography variant='h6'>Scripts for: {dev.name}</Typography>
      <Stack direction='row' spacing={1}>
        <TextField label='Instance name' value={instanceName} onChange={e=>setInstanceName(e.target.value)} />
        <TextField label='Script path' value={scriptPath} onChange={e=>setScriptPath(e.target.value)} />
        <Button variant='contained' onClick={create}>Add</Button>
      </Stack>

      {/* Limit visible scripts to 10 and make the list scrollable to avoid pushing the edit form down */}
      <Box sx={{ maxHeight: 10 * 48, overflowY: 'auto' }}>
        <List dense>
          {shownScripts.map((s, idx) => {
            const isSelected = selectedId === s.id
            return (
              <ListItem key={s.id} secondaryAction={
                <IconButton edge='end' onClick={(e)=>openMenu(e, s.id)} aria-label='actions' size='small' sx={{ color: isSelected ? '#fff' : undefined }}>
                  <MoreVertIcon />
                </IconButton>
              } sx={{ backgroundColor: isSelected ? '#0b3d91' : (idx % 2 === 1 ? 'rgba(11,61,145,0.08)' : 'transparent') }}>
                <ListItemButton
                  selected={isSelected}
                  onClick={()=>{ if (onSelectScript) onSelectScript(s.id, dev.id); else onSelect(s.id) }}
                  sx={{ py: 0.5, color: isSelected ? '#fff' : undefined }}
                >
                  <ListItemText primary={s.instanceName} secondary={`${s.args.method || 'GET'} ${s.args.outputFormat || 'json'}`} sx={{ '& .MuiListItemText-primary': { color: isSelected ? '#fff' : 'inherit' }, '& .MuiListItemText-secondary': { color: isSelected ? '#fff' : 'inherit' } }} />
                </ListItemButton>
              </ListItem>
            )
          })}
          {shownScripts.length===0 && <Typography color='text.secondary'>No scripts.</Typography>}
        </List>
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={()=>{ if (menuScriptId) onEdit(menuScriptId); closeMenu() }}>Edit</MenuItem>
        <MenuItem onClick={()=>{ if (menuScriptId) duplicate(menuScriptId); closeMenu() }}>Duplicate</MenuItem>
        <MenuItem onClick={()=>{ if (menuScriptId && onCopyScript && deviceId) onCopyScript(menuScriptId, deviceId); closeMenu() }}>Copy</MenuItem>
        <MenuItem onClick={()=>{ if (menuScriptId && onCutScript && deviceId) onCutScript(menuScriptId, deviceId); closeMenu() }}>Cut</MenuItem>
        <MenuItem onClick={()=>{ if (menuScriptId) remove(menuScriptId); closeMenu() }} sx={{color: 'error.main'}}>Delete</MenuItem>
      </Menu>
    </Stack>
  )
}
