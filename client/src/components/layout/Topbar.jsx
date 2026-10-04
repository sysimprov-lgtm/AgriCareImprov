import { useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { IoNotificationsOutline } from 'react-icons/io5'
import Header from './Header'
import Footer from './Footer'

const Topbar = ({ children, notificationCount = 0, navLinks = [] }) => {
    const theme = useSelector((state) => state.theme)
    const navigate = useNavigate()
    const location = useLocation()

    const allLinks = [...navLinks, { label: 'Notifications', path: '/notifications', icon: IoNotificationsOutline, badge: notificationCount }]

    return (
        <div className='min-h-screen flex flex-col' style={{ backgroundColor: theme.backgroundColor }}>
            {/* Header */}
            <Header notificationCount={notificationCount} />

            {/* Nav Links — desktop only */}
            <nav className='hidden md:flex items-center gap-1 px-6 py-1 shadow-sm justify-end' style={{ backgroundColor: theme.primaryColor, borderTop: `1px solid rgba(255,255,255,0.1)` }}>
                {navLinks.map(({ label, path, icon: Icon }) => {
                    const isActive = location.pathname === path
                    return (
                        <button key={path} onClick={() => navigate(path)}
                            className='flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-md'
                            style={{
                                backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                                color: '#fff',
                                opacity: isActive ? 1 : 0.75,
                            }}>
                            <Icon size={16} />
                            {label}
                        </button>
                    )
                })}
            </nav>

            {/* Page Content */}
            <main className='flex-1 p-4 md:p-6 pb-24 md:pb-6'>
                <div key={location.key} className='page-transition'>
                    {children}
                </div>
            </main>

            {/* Footer — desktop only */}
            <div className='hidden md:block'><Footer /></div>

            {/* Mobile Bottom Nav */}
            <div className='fixed bottom-0 left-0 right-0 z-[60] flex md:hidden items-center justify-around py-2 shadow-lg'
                style={{ backgroundColor: theme.primaryColor, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                {allLinks.map(({ label, path, icon: Icon, badge }) => {
                    const isActive = location.pathname === path
                    const shortLabel = label === 'Notifications' ? 'Notifs' : label === 'Extension Workers' ? 'Workers' : label
                    return (
                        <button key={path} onClick={() => navigate(path)}
                            className='flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all'
                            style={{ color: '#fff', opacity: isActive ? 1 : 0.6 }}>
                            <div className='relative'>
                                <Icon size={20} />
                                {badge > 0 && (
                                    <span className='absolute -top-1 -right-1 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full'
                                        style={{ backgroundColor: theme.dangerColor, fontSize: '9px' }}>
                                        {badge > 99 ? '99+' : badge}
                                    </span>
                                )}
                            </div>
                            <span className='text-xs'>{shortLabel}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default Topbar
