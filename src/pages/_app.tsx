import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { appWithTranslation } from 'next-i18next'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ClerkProvider } from '@clerk/nextjs'

function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider {...pageProps}>
      <AuthProvider>
        <Header />
        <Component {...pageProps} />
        <Footer />
        <Toaster />
      </AuthProvider>
    </ClerkProvider>
  )
}

export default appWithTranslation(App) 