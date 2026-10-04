import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { setAppLoading, setUnauthorized, setSessionExpired } from './store/slices/appSlice'
import { setTheme } from './store/slices/themeSlice'
import { setCredentials } from './store/slices/authSlice'
import { getCookie } from './utils/cookies'
import SessionExpiredDialog from './components/ui/SessionExpiredDialog'

import api from './services/api'
import PageLoader from './components/ui/PageLoader'
import minecraftMusic from './assets/sound-minecraft.mp3'

import LandingPage from './pages/LandingPage'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import PendingApproval from './pages/auth/PendingApproval'

import FarmersAccounts from './pages/admin/FarmersAccounts'
import AdminExtensionWorkers from './pages/admin/ExtensionWorkers'
import AdminKnowledgeRepository from './pages/admin/KnowledgeRepository'
import Reports from './pages/admin/Reports'

import SharedDashboard from './pages/shared/Dashboard'
import SharedNotifications from './pages/shared/Notifications'

import FarmerKnowledgeRepository from './pages/farmer/KnowledgeRepository'
import FarmerExtensionWorkers from './pages/farmer/ExtensionWorkers'

import Tickets from './pages/extensionworker/Tickets'

import Init from './pages/system/init'
import Overview from './pages/system/panel/Overview'
import Endpoints from './pages/system/panel/Endpoints'
import SystemControl from './pages/system/panel/SystemControl'
import Templates from './pages/system/panel/Templates'

const protectedPaths = ['/dashboard', '/admin/', '/farmer', '/extension-worker', '/notifications']

function RouteGuard() {
  const location = useLocation()
  const dispatch = useDispatch()

  useEffect(() => {
    const token = getCookie('token')
    if (!token && protectedPaths.some(p => location.pathname.startsWith(p))) {
      dispatch(setUnauthorized(true))
    }
  }, [location.pathname, dispatch])

  return null
}

function App() {
  const theme = useSelector((state) => state.theme)
  const audioRef = useRef(null)


  useEffect(() => {
    if (!theme.minecraftMusic) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      return
    }

    const audio = new Audio(minecraftMusic)
    audio.loop = true
    audio.volume = 0.3
    audioRef.current = audio

    audio.play().catch(() => {
      const playOnClick = () => {
        audio.play().catch(() => { })
        document.removeEventListener('click', playOnClick, true)
      }
      document.addEventListener('click', playOnClick, true)
    })

    return () => {
      audio.pause()
      audioRef.current = null
    }
  }, [theme.minecraftMusic])

  const dispatch = useDispatch()
  const isLoading = useSelector((state) => state.app.isLoading)
  const [systemDisabled, setSystemDisabled] = useState(false)
  const [themeLoaded, setThemeLoaded] = useState(false)

  useEffect(() => {
    const token = getCookie('token')

    api.get('/theme/').then(res => {
      dispatch(setTheme(res.data))
      setThemeLoaded(true)
    }).catch(() => setThemeLoaded(true))

    api.get('/system/config/').then(res => {
      setSystemDisabled(!res.data.isSystemEnabled)
      const useSupabase = res.data.useSupabaseAuth ?? false
      dispatch(setTheme({
        useSupabaseAuth: useSupabase,
        dashboardTemplates: res.data.dashboardTemplates ?? { admin: 1, farmer: 1, extension_worker: 1 },
      }))

      if (token) {
        const meUrl = useSupabase ? '/auth/supabase/me/' : '/auth/me/'
        api.get(meUrl).then(r => {
          dispatch(setCredentials({ user: r.data, token }))
        }).catch(() => {
          dispatch(setSessionExpired(true))
        })
      }
    }).catch(() => { })

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/system/`)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'theme') {
        const { type, ...themeData } = data
        dispatch(setTheme(themeData))
      } else if (data.type === 'config') {
        setSystemDisabled(!data.isSystemEnabled)
        dispatch(setTheme({
          useSupabaseAuth: data.useSupabaseAuth ?? false,
          dashboardTemplates: data.dashboardTemplates ?? { admin: 1, farmer: 1, extension_worker: 1 },
        }))
      }
    }
    ws.onerror = () => ws.close()
    return () => ws.close()
  }, [dispatch])




  if (!themeLoaded) return <PageLoader onDone={() => { }} />

  if (systemDisabled && !window.location.pathname.startsWith('/system/')) return (
    <div className='min-h-screen flex flex-col items-center justify-center gap-4 text-center px-8'
      style={{ backgroundColor: theme.backgroundColor }}>
      <span className='text-6xl'>🔧</span>
      <h1 className='text-2xl font-bold' style={{ color: theme.textColor }}>System Under Maintenance</h1>
      <p className='text-sm opacity-60' style={{ color: theme.textColor }}>
        We're currently performing maintenance. Please check back later.
      </p>
    </div>
  )

  return (
    <div style={{ fontFamily: theme.minecraftMode ? 'Minecraft' : 'sans-serif' }}>
      {isLoading && <PageLoader onDone={() => dispatch(setAppLoading(false))} />}
      <div style={{ visibility: isLoading ? 'hidden' : 'visible' }}>
        <BrowserRouter>
          <RouteGuard />
          <Routes>
            {/* Public */}
            <Route path='/' element={<LandingPage />} />
            <Route path='/login' element={<Login />} />
            <Route path='/admin-login' element={<Login />} />
            <Route path='/backdoor' element={<Navigate to='/admin-login' replace />} />
            <Route path='/register' element={<Register />} />
            <Route path='/forgot-password' element={<ForgotPassword />} />
            <Route path='/reset-password' element={<ResetPassword />} />
            <Route path='/pending-approval' element={<PendingApproval />} />

            {/* Shared */}
            <Route path='/dashboard' element={<SharedDashboard />} />
            <Route path='/notifications' element={<SharedNotifications />} />

            {/* Admin */}
            <Route path='/admin/farmers' element={<FarmersAccounts />} />
            <Route path='/admin/extension-workers' element={<AdminExtensionWorkers />} />
            <Route path='/admin/knowledge-repository' element={<AdminKnowledgeRepository />} />
            <Route path='/admin/reports' element={<Reports />} />

            {/* Farmer */}
            <Route path='/farmer/knowledge-repository' element={<FarmerKnowledgeRepository />} />
            <Route path='/farmer/extension-workers' element={<FarmerExtensionWorkers />} />

            {/* Extension Worker */}
            <Route path='/extension-worker/tickets' element={<Tickets />} />

            {/* SuperAdmin */}
            <Route path='/system/init' element={<Init />} />
            <Route path='/system/panel/overview' element={<Overview />} />
            <Route path='/system/panel/endpoints' element={<Endpoints />} />
            <Route path='/system/panel/control' element={<SystemControl />} />
            <Route path='/system/panel/templates' element={<Templates />} />
          </Routes>
          <SessionExpiredDialog />
        </BrowserRouter>
      </div>
    </div>
  )
}

export default App
