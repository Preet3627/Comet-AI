'use client';
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import React from 'react'
import { useRouter } from 'next/navigation';

const BackBtn = () => {
    const router = useRouter();
    return (
        <button onClick={() => router.back()} className='bg-white-900 border border-white/20 hover:border-white/60 transition-all duration-200 rounded-full p-2'>
            <ArrowLeftIcon className="w-5 h-5 text-white" />
        </button>
    )
}

export default BackBtn
