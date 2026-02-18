"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <>
      <style jsx global>{`
        /* Base toast styling */
        [data-sonner-toast] {
          border-radius: 12px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          backdrop-filter: blur(8px) !important;
        }
        /* Success Toast */
        [data-sonner-toast][data-type="success"] {
          background: rgb(248 250 252) !important; /* slate-50 */
          border: 1px solid rgb(28, 138, 68) !important; /* green-500 border */
          border-left: 4px solid rgb(28, 138, 68) !important; /* green-500 left accent */
        }
        [data-sonner-toast][data-type="success"] [data-title] {
          color: rgb(15 23 42) !important; /* slate-900 */
          font-weight: 500 !important;
        }
        [data-sonner-toast][data-type="success"] [data-description] {
          color: rgb(71 85 105) !important; /* slate-600 */
        }

        /* Error Toast */
        [data-sonner-toast][data-type="error"] {
          background: rgb(248 250 252) !important; /* slate-50 */
          border: 1px solid rgb(186, 48, 48) !important; /* red-500 border */
          border-left: 4px solid rgb(186, 48, 48) !important; /* red-500 left accent */
        }
        [data-sonner-toast][data-type="error"] [data-title] {
          color: rgb(15 23 42) !important; /* slate-900 */
          font-weight: 500 !important;
        }
        [data-sonner-toast][data-type="error"] [data-description] {
          color: rgb(71 85 105) !important; /* slate-600 */
        }

        /* Info Toast */
        [data-sonner-toast][data-type="info"] {
          background: rgb(248 250 252) !important; /* slate-50 */
          border: 1px solid rgb(59 130 246) !important; /* blue-500 border */
          border-left: 4px solid rgb(59 130 246) !important; /* blue-500 left accent */
        }
        [data-sonner-toast][data-type="info"] [data-title] {
          color: rgb(15 23 42) !important; /* slate-900 */
          font-weight: 500 !important;
        }
        [data-sonner-toast][data-type="info"] [data-description] {
          color: rgb(71 85 105) !important; /* slate-600 */
        }

        /* Warning Toast */
        [data-sonner-toast][data-type="warning"] {
          background: rgb(248 250 252) !important; /* slate-50 */
          border: 1px solid rgb(245 158 11) !important; /* amber-500 border */
          border-left: 4px solid rgb(245 158 11) !important; /* amber-500 left accent */
        }
        [data-sonner-toast][data-type="warning"] [data-title] {
          color: rgb(15 23 42) !important; /* slate-900 */
          font-weight: 500 !important;
        }
        [data-sonner-toast][data-type="warning"] [data-description] {
          color: rgb(71 85 105) !important; /* slate-600 */
        }

        /* Loading Toast */
        [data-sonner-toast][data-type="loading"] {
          background: rgb(248 250 252) !important; /* slate-50 */
          border: 1px solid rgb(139 92 246) !important; /* violet-500 border */
          border-left: 4px solid rgb(139 92 246) !important; /* violet-500 left accent */
        }
        [data-sonner-toast][data-type="loading"] [data-title] {
          color: rgb(15 23 42) !important; /* slate-900 */
          font-weight: 500 !important;
        }
        [data-sonner-toast][data-type="loading"] [data-description] {
          color: rgb(71 85 105) !important; /* slate-600 */
        }

        /* Dark mode */
        .dark [data-sonner-toast][data-type="success"] {
          background: rgb(15 23 42) !important; /* slate-900 */
          border: 1px solid rgb(34 197 94) !important;
          border-left: 4px solid rgb(34 197 94) !important;
        }
        .dark [data-sonner-toast][data-type="success"] [data-title] {
          color: rgb(248 250 252) !important; /* slate-50 */
        }
        .dark [data-sonner-toast][data-type="success"] [data-description] {
          color: rgb(148 163 184) !important; /* slate-400 */
        }

        .dark [data-sonner-toast][data-type="error"] {
          background: rgb(15 23 42) !important; /* slate-900 */
          border: 1px solid rgb(239 68 68) !important;
          border-left: 4px solid rgb(239 68 68) !important;
        }
        .dark [data-sonner-toast][data-type="error"] [data-title] {
          color: rgb(248 250 252) !important; /* slate-50 */
        }
        .dark [data-sonner-toast][data-type="error"] [data-description] {
          color: rgb(148 163 184) !important; /* slate-400 */
        }

        .dark [data-sonner-toast][data-type="info"] {
          background: rgb(15 23 42) !important; /* slate-900 */
          border: 1px solid rgb(59 130 246) !important;
          border-left: 4px solid rgb(59 130 246) !important;
        }
        .dark [data-sonner-toast][data-type="info"] [data-title] {
          color: rgb(248 250 252) !important; /* slate-50 */
        }
        .dark [data-sonner-toast][data-type="info"] [data-description] {
          color: rgb(148 163 184) !important; /* slate-400 */
        }

        .dark [data-sonner-toast][data-type="warning"] {
          background: rgb(15 23 42) !important; /* slate-900 */
          border: 1px solid rgb(245 158 11) !important;
          border-left: 4px solid rgb(245 158 11) !important;
        }
        .dark [data-sonner-toast][data-type="warning"] [data-title] {
          color: rgb(248 250 252) !important; /* slate-50 */
        }
        .dark [data-sonner-toast][data-type="warning"] [data-description] {
          color: rgb(148 163 184) !important; /* slate-400 */
        }

        .dark [data-sonner-toast][data-type="loading"] {
          background: rgb(15 23 42) !important; /* slate-900 */
          border: 1px solid rgb(139 92 246) !important;
          border-left: 4px solid rgb(139 92 246) !important;
        }
        .dark [data-sonner-toast][data-type="loading"] [data-title] {
          color: rgb(248 250 252) !important; /* slate-50 */
        }
        .dark [data-sonner-toast][data-type="loading"] [data-description] {
          color: rgb(148 163 184) !important; /* slate-400 */
        }
      `}</style>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        toastOptions={{
          classNames: {
            toast: "group toast",
            description: "group-[.toast]:text-muted-foreground",
            actionButton: "group-[.toast]:bg-slate-900 group-[.toast]:text-white hover:group-[.toast]:bg-slate-800 group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5",
            cancelButton: "group-[.toast]:bg-slate-200 group-[.toast]:text-slate-700 hover:group-[.toast]:bg-slate-300 group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5",
          },
        }}
        {...props}
      />
    </>
  )
}

export { Toaster }
