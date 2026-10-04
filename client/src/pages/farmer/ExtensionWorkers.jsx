import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { MdSearch, MdSupportAgent, MdAttachFile, MdClose, MdInsertDriveFile } from 'react-icons/md'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import FarmerLayout from '../../components/layout/FarmerLayout'
import Dialog from '../../components/ui/Dialog'
import Button from '../../components/ui/Button'
import api from '../../services/api'

const FarmerExtensionWorkers = () => {
    const theme = useSelector((state) => state.theme)
    const { user } = useSelector((state) => state.auth)
    const [workers, setWorkers] = useState([])
    const [positions, setPositions] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedWorker, setSelectedWorker] = useState(null)
    const [viewDialog, setViewDialog] = useState(false)
    const [ticketDialog, setTicketDialog] = useState(false)
    const [existingTicketDialog, setExistingTicketDialog] = useState(false)
    const [existingTicket, setExistingTicket] = useState(null)
    const [concern, setConcern] = useState('')
    const [title, setTitle] = useState('')
    const [attachedFile, setAttachedFile] = useState(null)
    const [fileError, setFileError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const fileInputRef = useRef(null)

    const fetchWorkers = () => {
        api.get('/users/extension-workers/').then(res => {
            setWorkers(res.data.filter(w => !w.isPending && w.isActive))
            setLoading(false)
        }).catch(() => setLoading(false))
    }

    useEffect(() => {
        fetchWorkers()
        api.get('/positions/').then(res => setPositions(res.data))
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/admin-updates/`)
        ws.onmessage = () => fetchWorkers()
        ws.onerror = () => ws.close()
        return () => ws.close()
    }, [])

    const getPositionName = (positionId) => {
        const pos = positions.find(p => p.id === positionId)
        return pos ? pos.name : 'N/A'
    }

    const filtered = workers.filter(w =>
        `${w.firstName} ${w.lastName} ${getPositionName(w.positionId)}`.toLowerCase().includes(search.toLowerCase())
    )

    const handleView = (worker) => {
        setSelectedWorker(worker)
        setViewDialog(true)
    }

    const handleOpenTicketForm = () => {
        setConcern('')
        setTitle('')
        setAttachedFile(null)
        setFileError('')
        setViewDialog(false)
        setTicketDialog(true)
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        if (file.size > 750 * 1024) { setFileError('File must be under 1MB.'); e.target.value = ''; return }
        setFileError('')
        const reader = new FileReader()
        reader.onload = (ev) => setAttachedFile({ data: ev.target.result, name: file.name, type: file.type })
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const handleCheckTicket = async () => {
        if (!title.trim() || !concern.trim()) return
        setSubmitting(true)
        try {
            const res = await api.post('/tickets/check/', {
                title,
                concern,
                extensionWorkerId: selectedWorker.id,
            })
            if (res.data.exists) {
                setExistingTicket(res.data.ticket)
                setTicketDialog(false)
                setExistingTicketDialog(true)
            } else {
                setExistingTicket(null)
                setTicketDialog(false)
                setExistingTicketDialog(true)
            }
        } catch {
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmitTicket = async (joinExisting = false) => {
        setSubmitting(true)
        try {
            await api.post('/tickets/submit/', {
                title,
                concern,
                extensionWorkerId: selectedWorker.id,
                extensionWorkerName: `${selectedWorker.firstName} ${selectedWorker.lastName}`,
                farmerName: `${user.firstName} ${user.lastName}`,
                joinExisting,
                ticketId: joinExisting ? existingTicket?.id : null,
                fileData: attachedFile?.data || '',
                fileName: attachedFile?.name || '',
                fileType: attachedFile?.type || '',
            })
            setExistingTicketDialog(false)
            setConcern('')
            setTitle('')
            setAttachedFile(null)
            setExistingTicket(null)
        } catch {
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <FarmerLayout>
            <div className='flex flex-col gap-4'>
                <h1 className='text-2xl font-bold' style={{ color: theme.textColor }}>Extension Workers</h1>

                {/* Search */}
                <div className='relative'>
                    <MdSearch size={18} className='absolute left-3 top-1/2 -translate-y-1/2 opacity-50' color={theme.textColor} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search by name or position...'
                        className='w-full pl-9 pr-4 py-2.5 text-sm outline-none border rounded-lg'
                        style={{ borderColor: theme.secondaryColor, backgroundColor: '#fff', color: theme.textColor }} />
                </div>

                {/* Cards */}
                {loading ? (
                    <div className='flex justify-center py-16'>
                        <AiOutlineLoading3Quarters className='animate-spin' size={28} color={theme.primaryColor} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className='flex flex-col items-center gap-2 py-16 opacity-40'>
                        <MdSupportAgent size={40} color={theme.textColor} />
                        <p className='text-sm' style={{ color: theme.textColor }}>No extension workers available</p>
                    </div>
                ) : (
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {filtered.map(worker => (
                            <div key={worker.id}
                                onClick={() => handleView(worker)}
                                className='flex flex-col items-center gap-3 p-6 rounded-xl cursor-pointer transition-all hover:shadow-md'
                                style={{ backgroundColor: '#fff', border: `1px solid ${theme.secondaryColor}` }}>
                                {worker.profilePicture ? (
                                    <img src={worker.profilePicture} className='w-16 h-16 rounded-full object-cover' />
                                ) : (
                                    <div className='w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold'
                                        style={{ backgroundColor: theme.primaryColor }}>
                                        {worker.firstName[0]}{worker.lastName[0]}
                                    </div>
                                )}
                                <div className='text-center'>
                                    <p className='font-semibold text-sm' style={{ color: theme.textColor }}>
                                        {worker.firstName} {worker.lastName}
                                    </p>
                                    <p className='text-xs opacity-50 mt-0.5' style={{ color: theme.textColor }}>
                                        @{worker.username}
                                    </p>
                                </div>
                                <span className='px-3 py-0.5 rounded-full text-xs font-medium'
                                    style={{ backgroundColor: theme.primaryColor + '18', color: theme.primaryColor }}>
                                    {getPositionName(worker.positionId)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* View Dialog */}
            <Dialog isOpen={viewDialog} onClose={() => setViewDialog(false)} title='Extension Worker'>
                {selectedWorker && (
                    <div className='flex flex-col items-center gap-4 text-sm w-full sm:min-w-[260px]'>
                        {selectedWorker.profilePicture ? (
                            <img src={selectedWorker.profilePicture} className='w-20 h-20 rounded-full object-cover' />
                        ) : (
                            <div className='w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold'
                                style={{ backgroundColor: theme.primaryColor }}>
                                {selectedWorker.firstName[0]}{selectedWorker.lastName[0]}
                            </div>
                        )}
                        <div className='text-center'>
                            <p className='font-semibold text-base' style={{ color: theme.textColor }}>
                                {selectedWorker.firstName} {selectedWorker.lastName}
                            </p>
                            <p className='text-xs opacity-50 mt-0.5' style={{ color: theme.textColor }}>
                                @{selectedWorker.username}
                            </p>
                        </div>
                        <span className='px-3 py-0.5 rounded-full text-xs font-medium'
                            style={{ backgroundColor: theme.primaryColor + '18', color: theme.primaryColor }}>
                            {getPositionName(selectedWorker.positionId)}
                        </span>
                        <hr className='w-full' style={{ borderColor: theme.secondaryColor }} />
                        <div className='flex w-full justify-end gap-2'>
                            <Button onClick={handleOpenTicketForm}>Submit Ticket</Button>
                            <Button variant='ghost' onClick={() => setViewDialog(false)}>Close</Button>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Ticket Form Dialog */}
            <Dialog isOpen={ticketDialog} onClose={() => setTicketDialog(false)} title='Submit a Ticket'>
                <div className='flex flex-col gap-4 w-full sm:min-w-[300px]'>
                    <div className='flex flex-col gap-1'>
                        <label className='text-xs font-medium opacity-60' style={{ color: theme.textColor }}>Name</label>
                        <input readOnly value={`${user?.firstName} ${user?.lastName}`}
                            className='w-full px-4 py-2.5 text-sm outline-none border rounded-lg opacity-60'
                            style={{ borderColor: theme.secondaryColor, backgroundColor: '#f9f9f9', color: theme.textColor }} />
                    </div>
                    <div className='flex flex-col gap-1'>
                        <label className='text-xs font-medium opacity-60' style={{ color: theme.textColor }}>Barangay</label>
                        <input readOnly value={user?.barangay || ''}
                            className='w-full px-4 py-2.5 text-sm outline-none border rounded-lg opacity-60'
                            style={{ borderColor: theme.secondaryColor, backgroundColor: '#f9f9f9', color: theme.textColor }} />
                    </div>
                    <div className='flex flex-col gap-1'>
                        <label className='text-xs font-medium' style={{ color: theme.textColor }}>Title</label>
                        <input value={title} onChange={e => setTitle(e.target.value)}
                            placeholder='Brief title of your concern...'
                            className='w-full px-4 py-2.5 text-sm outline-none border rounded-lg'
                            style={{ borderColor: theme.secondaryColor, backgroundColor: '#fff', color: theme.textColor }} />
                    </div>
                    <div className='flex flex-col gap-1'>
                        <label className='text-xs font-medium' style={{ color: theme.textColor }}>Concern</label>
                        <textarea value={concern} onChange={e => { setConcern(e.target.value); setFileError('') }}
                            placeholder='Describe your concern...'
                            rows={4}
                            className='w-full px-4 py-2.5 text-sm outline-none border rounded-lg resize-none'
                            style={{ borderColor: theme.secondaryColor, backgroundColor: '#fff', color: theme.textColor }} />
                    </div>
                    {attachedFile && (
                        <div className='flex items-center gap-2 px-3 py-2 rounded-lg text-xs'
                            style={{ backgroundColor: theme.primaryColor + '10', border: `1px solid ${theme.secondaryColor}` }}>
                            {attachedFile.type.startsWith('image/') ? (
                                <img src={attachedFile.data} className='w-10 h-10 rounded object-cover' />
                            ) : (
                                <MdInsertDriveFile size={20} color={theme.primaryColor} />
                            )}
                            <span className='flex-1 truncate' style={{ color: theme.textColor }}>{attachedFile.name}</span>
                            <button onClick={() => setAttachedFile(null)}><MdClose size={14} color={theme.textColor} /></button>
                        </div>
                    )}
                    <input ref={fileInputRef} type='file' className='hidden' onChange={handleFileChange} />
                    {fileError && <p className='text-xs' style={{ color: theme.dangerColor }}>{fileError}</p>}
                    <div className='flex justify-between items-center'>
                        <div className='flex flex-col gap-0.5'>
                            <button onClick={() => fileInputRef.current?.click()}
                                className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all hover:opacity-80'
                                style={{ color: theme.primaryColor, borderColor: theme.primaryColor, backgroundColor: theme.primaryColor + '10' }}>
                                <MdAttachFile size={15} /> Attach File
                            </button>
                            <p className='text-xs opacity-40' style={{ color: theme.textColor }}>Max file size: 1MB</p>
                        </div>
                        <div className='flex gap-2'>
                            <Button variant='ghost' onClick={() => setTicketDialog(false)}>Cancel</Button>
                            <Button onClick={handleCheckTicket} disabled={!title.trim() || !concern.trim() || submitting}>
                                {submitting ? 'Checking...' : 'Next'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Dialog>

            {/* Existing Ticket / Confirmation Dialog */}
            <Dialog
                isOpen={existingTicketDialog}
                onClose={() => setExistingTicketDialog(false)}
                title={existingTicket ? 'Existing Ticket Found' : 'Submit Ticket'}
            >
                <div className='flex flex-col gap-4 w-full sm:min-w-[280px]'>
                    {existingTicket ? (
                        <>
                            <p className='text-sm' style={{ color: theme.textColor }}>
                                A ticket about a similar concern already exists. Would you like to join the conversation?
                            </p>
                            <div className='p-3 rounded-lg text-sm' style={{ backgroundColor: theme.primaryColor + '10', border: `1px solid ${theme.secondaryColor}` }}>
                                <p className='font-semibold' style={{ color: theme.textColor }}>{existingTicket.title}</p>
                                <p className='text-xs opacity-60 mt-0.5' style={{ color: theme.textColor }}>{existingTicket.concern}</p>
                                <span className='text-xs mt-1 inline-block px-2 py-0.5 rounded-full'
                                    style={{
                                        backgroundColor: existingTicket.status === 'pending' ? '#fef9c3' : existingTicket.status === 'ongoing' ? '#dbeafe' : '#dcfce7',
                                        color: existingTicket.status === 'pending' ? '#ca8a04' : existingTicket.status === 'ongoing' ? '#1d4ed8' : '#16a34a',
                                    }}>
                                    {existingTicket.status}
                                </span>
                            </div>
                            <div className='flex justify-end gap-2 flex-wrap'>
                                <Button variant='ghost' onClick={() => { setExistingTicketDialog(false); setTicketDialog(true) }}>Back</Button>
                                <Button variant='outline' onClick={() => handleSubmitTicket(false)} disabled={submitting}>
                                    Create New Ticket
                                </Button>
                                <Button onClick={() => handleSubmitTicket(true)} disabled={submitting}>
                                    {submitting ? 'Joining...' : 'Join Conversation'}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className='text-sm' style={{ color: theme.textColor }}>
                                Are you sure you want to submit this ticket to <strong>{selectedWorker?.firstName} {selectedWorker?.lastName}</strong>?
                            </p>
                            <div className='flex justify-end gap-2'>
                                <Button variant='ghost' onClick={() => { setExistingTicketDialog(false); setTicketDialog(true) }}>Back</Button>
                                <Button onClick={() => handleSubmitTicket(false)} disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Confirm'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Dialog>
        </FarmerLayout>
    )
}

export default FarmerExtensionWorkers
