'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUsuario } from '../lib/api'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const u = getUsuario()
    router.replace(u ? '/dashboard' : '/login')
  }, [])
  return null
}
