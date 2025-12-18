
import React, { useEffect, useState } from 'react'
import { Paper, Stack, Typography, Tabs, Tab, Box, IconButton, Tooltip, Snackbar, Alert } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../store/store'
import { parseFBCSKM } from '../store/fbcskmSlice'
import { serializeDevices } from '../services/serializer'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

export default function Viewer({ raw, onRawChange }: { raw: string, onRawChange: (t: string) => void }){
  const dispatch = useAppDispatch()
  const devices = useAppSelector(s => s.fbcskm.devices)

  useEffect(() => { if (raw && raw.trim().length>0) dispatch(parseFBCSKM(raw)) }, [raw])

  const [tab, setTab] = useState<number>(0)
  const preview = serializeDevices(devices)

  const [copiedOpen, setCopiedOpen] = useState(false)
  const handleCopy = async () => {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(preview || '')
      } else {
        const ta = document.createElement('textarea')
        ta.value = preview || ''
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
      }
      setCopiedOpen(true)
    } catch (e) {
      console.error('Copy failed', e)
      setCopiedOpen(true)
    }
  }

  return (
    <Paper variant='outlined' sx={{p:2}}>
      <Stack spacing={1}>
        <Box sx={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <Typography variant='h6'>{tab === 0 ? 'Viewer (paste or load FBCSKM line)' : 'Preview Configuration'}</Typography>
          <Box sx={{display:'flex', alignItems:'center', gap:1}}>
            <Tabs value={tab} onChange={(e, v) => setTab(v)} aria-label="Viewer / Preview Tabs" sx={{ml:2}}>
              <Tab label="Viewer" />
              <Tab label="Preview Configuration" />
            </Tabs>

            {tab === 1 && (
              <Tooltip title="Copy preview to clipboard">
                <IconButton size="small" onClick={handleCopy} aria-label="copy preview">
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {tab === 0 ? (
          <textarea style={{width:'100%', minHeight: 120}} value={raw} onChange={e=>onRawChange(e.target.value)} />
        ) : (
          <textarea readOnly style={{width:'100%', minHeight: 120, background: '#f7f7f7'}} value={preview} />
        )}
      </Stack>
      <Snackbar open={copiedOpen} autoHideDuration={2000} onClose={()=>setCopiedOpen(false)} anchorOrigin={{vertical:'bottom', horizontal:'center'}}>
        <Alert onClose={()=>setCopiedOpen(false)} severity="success" sx={{width:'100%'}}>Preview copied to clipboard</Alert>
      </Snackbar>
    </Paper>
  )
}
