"use client";

import dynamic from 'next/dynamic'

const ClientOnlyPage = dynamic(() => import('./ClientOnlyPage'), { ssr: false })

export default function Page() {
  return <ClientOnlyPage />
}
