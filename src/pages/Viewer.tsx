
import React, { useEffect, useState } from 'react'
import { Paper, Stack, Typography, Tabs, Tab, Box } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../store/store'
import { parseFBCSKM } from '../store/fbcskmSlice'
import { serializeDevices } from '../services/serializer'

export default function Viewer({ raw, onRawChange }: { raw: string, onRawChange: (t: string) => void }){
  const dispatch = useAppDispatch()
  const devices = useAppSelector(s => s.fbcskm.devices)

  useEffect(() => { if (raw && raw.trim().length>0) dispatch(parseFBCSKM(raw)) }, [raw])

  const [tab, setTab] = useState<number>(0)
  const preview = serializeDevices(devices)

  return (
    <Paper variant='outlined' sx={{p:2}}>
      <Stack spacing={1}>
        <Box sx={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <Typography variant='h6'>{tab === 0 ? 'Viewer (paste or load FBCSKM line)' : 'Preview Configuration'}</Typography>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} aria-label="Viewer / Preview Tabs" sx={{ml:2}}>
            <Tab label="Viewer" />
            <Tab label="Preview Configuration" />
          </Tabs>
        </Box>

        {tab === 0 ? (
          <textarea style={{width:'100%', minHeight: 120}} value={raw} onChange={e=>onRawChange(e.target.value)} />
        ) : (
          <textarea readOnly style={{width:'100%', minHeight: 120, background: '#f7f7f7'}} value={preview} />
        )}
      </Stack>
    </Paper>
  )
}
