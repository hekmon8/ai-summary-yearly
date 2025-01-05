import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import type { GetStaticProps } from 'next'

export default function SignUpPage() {
  const { t } = useTranslation('common')
  
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1a1d24] rounded-2xl shadow-xl border border-gray-800/50 p-8">
          <SignUp 
            appearance={{
              baseTheme: dark,
              elements: {
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
                card: 'bg-transparent shadow-none border-0',
                headerTitle: 'text-white',
                headerSubtitle: 'text-gray-400',
                socialButtonsBlockButton: 'border border-gray-700 bg-[#1a1d24] hover:bg-[#242832] text-white',
                socialButtonsBlockButtonText: 'text-white font-medium',
                dividerLine: 'bg-gray-800',
                dividerText: 'text-gray-500',
                formFieldLabel: 'text-gray-400',
                formFieldInput: 'bg-[#242832] border-gray-700 text-white',
                footerActionLink: 'text-blue-500 hover:text-blue-400',
                identityPreviewText: 'text-white',
                identityPreviewEditButton: 'text-blue-500 hover:text-blue-400',
                formFieldAction: 'text-blue-500 hover:text-blue-400',
                alert: 'bg-red-500/10 border border-red-500/20 text-red-500',
                alertText: 'text-red-500',
                formResendCodeLink: 'text-blue-500 hover:text-blue-400',
                otpCodeFieldInput: 'bg-[#242832] border-gray-700 text-white'
              },
              layout: {
                socialButtonsPlacement: 'top'
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

// 这个页面应该在客户端渲染，所以返回空的 paths
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true
  }
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'zh', ['common']))
    }
  }
} 