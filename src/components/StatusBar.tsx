import { useState, useEffect } from 'react'
import './StatusBar.css'

function useTime() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  )
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    }, 10000)
    return () => clearInterval(id)
  }, [])
  return time
}

function useDate() {
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  )
  useEffect(() => {
    const id = setInterval(() => {
      setDate(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }))
    }, 60000)
    return () => clearInterval(id)
  }, [])
  return date
}

export default function StatusBar() {
  const time = useTime()
  const date = useDate()

  return (
    <div className="statusbar">
      <div className="statusbar__center">
        <span>{date}</span>
        <span className="statusbar__sep">·</span>
        <span>{time}</span>
      </div>
    </div>
  )
}
