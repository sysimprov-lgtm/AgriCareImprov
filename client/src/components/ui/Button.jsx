import { useSelector } from 'react-redux'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
}

const Button = ({ variant = 'primary', size = 'md', disabled = false, loading = false, onClick, type = 'button', style: customStyle, children }) => {
    const theme = useSelector((state) => state.theme)

    const variantStyle = {
        primary: { backgroundColor: theme.primaryColor, color: '#fff', border: 'none' },
        secondary: { backgroundColor: 'transparent', color: theme.primaryColor, border: `1px solid ${theme.primaryColor}` },
        danger: { backgroundColor: theme.dangerColor, color: '#fff', border: 'none' },
        ghost: { backgroundColor: 'transparent', color: theme.textColor, border: 'none' },
    }

    return (
        <button
            type={type}
            className={`${sizes[size]} font-medium transition-opacity duration-200 ${disabled || loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ ...variantStyle[variant], borderRadius: theme.borderRadius, ...customStyle }}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {loading ? <AiOutlineLoading3Quarters className='animate-spin' /> : children}
        </button>
    )
}

export default Button
