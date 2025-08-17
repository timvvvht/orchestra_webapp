import React from 'react'
import { useToast } from '@/components/ui/toast'
import { Sparkles, Zap, Heart, Coffee } from 'lucide-react'

const ToastDemo: React.FC = () => {
  const { toast } = useToast()

  const showBasicToast = () => {
    toast({
      title: 'Basic notification',
      description: 'This is a default toast message'
    })
  }

  const showSuccessToast = () => {
    toast({
      title: 'Success!',
      description: 'Your changes have been saved successfully',
      variant: 'success'
    })
  }

  const showWarningToast = () => {
    toast({
      title: 'Warning',
      description: 'This action may have unintended consequences',
      variant: 'warning'
    })
  }

  const showErrorToast = () => {
    toast({
      title: 'Error occurred',
      description: 'Failed to save your changes. Please try again.',
      variant: 'error'
    })
  }

  const showToastWithAction = () => {
    toast({
      title: 'File deleted',
      description: 'The file has been moved to trash',
      variant: 'success',
      action: {
        label: 'Undo',
        onClick: () => {
          toast({
            title: 'Restored',
            description: 'File has been restored from trash',
            variant: 'success'
          })
        }
      }
    })
  }

  const showCustomIconToast = () => {
    toast({
      title: 'Mystical energy detected',
      description: 'The system is resonating with cosmic frequencies',
      variant: 'default',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />
    })
  }

  const showPersistentToast = () => {
    toast({
      title: 'Persistent notification',
      description: 'This toast will stay until you close it manually',
      variant: 'warning',
      duration: 0, // 0 = persist until manual close
      icon: <Zap className="w-4 h-4 text-amber-400" />
    })
  }

  const showDifferentPlacements = () => {
    const placements = [
      'top-left', 'top-center', 'top-right',
      'bottom-left', 'bottom-center', 'bottom-right'
    ] as const

    placements.forEach((placement, index) => {
      setTimeout(() => {
        toast({
          title: `${placement} toast`,
          description: `This toast appears in the ${placement} position`,
          variant: index % 2 === 0 ? 'success' : 'default',
          placement,
          duration: 3000
        })
      }, index * 200) // Stagger the toasts
    })
  }

  return (
    <div className="min-h-screen bg-black p-8">
      {/* Background layers */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extralight text-white/90 mb-4 tracking-tight">
            Toast System Demo
          </h1>
          <p className="text-white/60 text-lg">
            Mystical notifications for the Orchestra experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Variants */}
          <div className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-medium text-white/90 mb-4">Basic Variants</h3>
            <div className="space-y-3">
              <button
                onClick={showBasicToast}
                className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200"
              >
                Default Toast
              </button>
              <button
                onClick={showSuccessToast}
                className="w-full px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-all duration-200"
              >
                Success Toast
              </button>
              <button
                onClick={showWarningToast}
                className="w-full px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-all duration-200"
              >
                Warning Toast
              </button>
              <button
                onClick={showErrorToast}
                className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all duration-200"
              >
                Error Toast
              </button>
            </div>
          </div>

          {/* Interactive Features */}
          <div className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-medium text-white/90 mb-4">Interactive</h3>
            <div className="space-y-3">
              <button
                onClick={showToastWithAction}
                className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all duration-200"
              >
                <Heart className="w-4 h-4 inline mr-2" />
                With Action
              </button>
              <button
                onClick={showCustomIconToast}
                className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-all duration-200"
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                Custom Icon
              </button>
              <button
                onClick={showPersistentToast}
                className="w-full px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-all duration-200"
              >
                <Coffee className="w-4 h-4 inline mr-2" />
                Persistent
              </button>
            </div>
          </div>

          {/* Placement Demo */}
          <div className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-medium text-white/90 mb-4">Placements</h3>
            <button
              onClick={showDifferentPlacements}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-white rounded-lg transition-all duration-200"
            >
              Show All Positions
            </button>
            <p className="text-xs text-white/50 mt-2">
              Demonstrates all 6 placement positions
            </p>
          </div>
        </div>

        {/* Usage Example */}
        <div className="mt-12 bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-medium text-white/90 mb-4">Usage Example</h3>
          <pre className="text-sm text-white/70 bg-black/20 rounded-lg p-4 overflow-x-auto">
{`import { useToast } from '@/components/ui/toast'

const { toast } = useToast()

toast({
  title: 'Success!',
  description: 'Your changes have been saved',
  variant: 'success',
  placement: 'bottom-right',
  duration: 4000,
  action: {
    label: 'Undo',
    onClick: () => revertChanges()
  }
})`}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default ToastDemo