
import React, { useEffect } from 'react'
import { Paper, Stack, Typography } from '@mui/material'
import { useAppDispatch } from '../store/store'
import { parseFBCSKM } from '../store/fbcskmSlice'

export default function Viewer({ raw, onRawChange }: { raw: string, onRawChange: (t: string) => void }){
  const dispatch = useAppDispatch()
  useEffect(() => { if (raw && raw.trim().length>0) dispatch(parseFBCSKM(raw)) }, [raw])
  return (
    <Paper variant='outlined' sx={{p:2}}>
      <Stack spacing={1}>
        <Typography variant='h6'>Viewer (paste or load FBCSKM line)</Typography>
        <textarea style={{width:'100%', minHeight: 120}} value={raw} onChange={e=>onRawChange(e.target.value)} />
      </Stack>
    </Paper>
  )
}
