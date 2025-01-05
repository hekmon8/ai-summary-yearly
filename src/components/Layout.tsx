import { type FC, type ReactNode } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

interface LayoutProps {
  children: ReactNode
  hideHeader?: boolean
  hideFooter?: boolean
}

const Layout: FC<LayoutProps> = ({ children, hideHeader = false, hideFooter = false }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0f1117] text-white">
      {!hideHeader && <Header />}
      <div className="flex-grow">
        {children}
      </div>
      {!hideFooter && <Footer />}
    </div>
  )
}

export default Layout 