import React, { useState } from 'react'

interface ResultCardProps {
  text: string
  svgUrl: string
}

export default function ResultCard({ text, svgUrl }: ResultCardProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    if (!navigator.share) {
      console.error('Web Share API not supported')
      return
    }

    try {
      await navigator.share({
        title: 'AI Diss 年度总结',
        text: text,
        url: window.location.href
      })
    } catch (err) {
      console.error('分享失败:', err)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      {/* SVG Preview */}
      <div className="aspect-[3/2] rounded-lg overflow-hidden bg-gray-50">
        <img 
          src={svgUrl} 
          alt="Diss 总结图片"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Text Content */}
      <div className="space-y-4">
        <p className="text-gray-800 text-lg leading-relaxed">
          {text}
        </p>
        
        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleShare}
            className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            分享
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(text)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {copied ? '已复制' : '复制文本'}
          </button>
        </div>
      </div>
    </div>
  )
} 