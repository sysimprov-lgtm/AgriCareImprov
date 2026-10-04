import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { GiWheat } from 'react-icons/gi'
import { FaUserAlt } from 'react-icons/fa'
import { MdSupportAgent } from 'react-icons/md'
import heroMinecraft from '../assets/hero-minecraft.jpg'
import heroBackground from '../assets/hero-background.jpg'
import logoMinecraft from '../assets/logo-minecraft.png'
import steveImg from '../assets/running-steve.png'
import Dialog from '../components/ui/Dialog'
import Button from '../components/ui/Button'

const LandingPage = () => {
    const navigate = useNavigate()
    const theme = useSelector((state) => state.theme)
    const [dialog, setDialog] = useState({ open: false, type: null })

    const openDialog = (type) => setDialog({ open: true, type })
    const closeDialog = () => setDialog({ open: false, type: null })

    const handleRoleSelect = (role) => {
        closeDialog()
        if (dialog.type === 'login') {
            if (role === 'farmer') navigate('/login?role=farmer')
            else if (role === 'extension') navigate('/login?role=extension')
            else navigate('/login?role=admin')
        } else {
            if (role === 'farmer') navigate('/register?role=farmer')
            else navigate('/register?role=extension')
        }
    }

    return (
        <div className='min-h-screen' style={{ backgroundColor: theme.backgroundColor }}>

            {/* Navbar */}
            <nav className='flex items-center justify-between px-4 md:px-16 py-4' style={{ backgroundColor: theme.primaryColor }}>
                <div className='flex items-center gap-2'>
                    {theme.minecraftLogo
                        ? <img src={logoMinecraft} alt='logo' className='h-10 w-10 object-contain' />
                        : <GiWheat size={28} color='#fff' />
                    }
                    <span className='text-xl font-bold tracking-wide text-white'>
                        Agri<span style={{ color: theme.secondaryColor }}>Care</span>
                    </span>
                </div>
                <div className='flex gap-3'>
                    <Button variant='secondary' onClick={() => openDialog('register')} style={{ color: '#fff', borderColor: '#fff' }}>Get Started</Button>
                </div>
            </nav>

            {/* Hero */}
            <section
                className='relative flex flex-col items-center justify-center text-center py-50 px-8 gap-6'
                style={{ backgroundImage: `url(${theme.minecraftHero ? heroMinecraft : heroBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
                <div className='absolute inset-0' style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} />
                <div className='relative z-10 flex flex-col items-center gap-6'>
                    {theme.minecraftLogo
                        ? <img src={logoMinecraft} alt='logo' className='h-20 w-20 md:h-35 md:w-35 object-contain' />
                        : <GiWheat size={72} color='#fff' />
                    }
                    <h1 className='text-5xl md:text-9xl font-extrabold text-white m-0 leading-tight'>
                        Agri<span style={{ color: theme.secondaryColor }}>Care</span>
                    </h1>
                    <p className='text-lg md:text-3xl text-white opacity-90 m-0'>
                        Grow <strong>SMART</strong>, Get Help <strong>FASTER</strong>
                    </p>
                    <div className='flex gap-3 mt-2'>
                        <Button size='lg' onClick={() => openDialog('login')}>Login</Button>
                        <Button size='lg' onClick={() => openDialog('register')}>Register</Button>
                    </div>
                </div>
            </section>

            {/* About */}
            <section className='py-16 px-8' style={{ backgroundColor: theme.primaryColor + '15' }}>
                <div className='flex items-center justify-center gap-12 max-w-4xl mx-auto'>
                    <div className='flex-1 text-center'>
                        <h2 className='text-3xl font-bold mb-4' style={{ color: theme.textColor }}>About AgriCare</h2>
                        <p className='text-base opacity-70 leading-relaxed' style={{ color: theme.textColor }}>
                            AgriCare is a smart ticketing and support system designed to connect farmers with extension workers, providing faster solutions to agricultural concerns.
                        </p>
                    </div>
                    {theme.minecraftSteve && (
                        <img src={steveImg} alt='running steve' className='h-40 object-contain hidden md:block' />
                    )}
                </div>
            </section>

            {/* Features */}
            <section className='py-16 px-8 text-center'>
                <h2 className='text-3xl font-bold mb-8' style={{ color: theme.textColor }}>Features</h2>
                <div className='flex gap-6 justify-center flex-wrap'>
                    {['Fast Ticket Support', 'Real-time Updates', 'AgriXa'].map((feature) => (
                        <div key={feature} className='p-6 w-48 flex flex-col items-center gap-3' style={{ backgroundColor: theme.primaryColor + '20', borderRadius: theme.borderRadius }}>
                            <GiWheat size={32} color={theme.primaryColor} />
                            <p className='font-semibold m-0' style={{ color: theme.textColor }}>{feature}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Dialog */}
            <Dialog isOpen={dialog.open} onClose={closeDialog} title={dialog.type === 'login' ? 'Login As' : 'Register As'} icon={GiWheat}>
                <div className='flex flex-col gap-3 mt-2'>
                    <div className='flex gap-3 justify-center items-stretch'>
                        <div onClick={() => handleRoleSelect('farmer')} className='flex flex-col items-center justify-start gap-2 p-8 w-48 cursor-pointer rounded-lg transition-opacity hover:opacity-80' style={{ backgroundColor: '#e8f5e9', border: '2px solid #478347' }}>
                            <FaUserAlt size={40} color='#478347' />
                            <span className='text-sm font-semibold' style={{ color: '#478347' }}>Farmer</span>
                            <span className='text-xs text-center' style={{ color: '#478347', opacity: 0.7 }}>Submit your agricultural concerns and get expert help from extension workers</span>
                        </div>
                        <div onClick={() => handleRoleSelect('extension')} className='flex flex-col items-center justify-start gap-2 p-8 w-48 cursor-pointer rounded-lg transition-opacity hover:opacity-80' style={{ backgroundColor: '#e3f2fd', border: '2px solid #1976d2' }}>
                            <MdSupportAgent size={40} color='#1976d2' />
                            <span className='text-sm font-semibold' style={{ color: '#1976d2' }}>Extension Worker</span>
                            <span className='text-xs text-center' style={{ color: '#1976d2', opacity: 0.7 }}>Respond, assist, and resolve farmer tickets efficiently</span>
                        </div>
                    </div>
                    <Button variant='ghost' onClick={closeDialog}>Cancel</Button>
                    {theme.minecraftMode && (
                        <div className='text-center mt-1'>
                            <span className='text-xs opacity-50' style={{ color: theme.textColor }}>Have you ever downloaded Minecraft? </span>
                            <a href='https://www.minecraft.net/en-us/download' target='_blank' rel='noreferrer' className='text-xs underline opacity-50' style={{ color: theme.primaryColor }}>Download now</a>
                        </div>
                    )}
                </div>
            </Dialog>

        </div>
    )
}

export default LandingPage
