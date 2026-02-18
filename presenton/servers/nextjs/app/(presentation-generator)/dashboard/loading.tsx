import { Skeleton } from '@/components/ui/skeleton'
import React from 'react'
import Header from './components/Header'
import Wrapper from '@/components/Wrapper'

const loading = () => {
    return (
      <div className=''>
      <Header />
      <Wrapper className=''>
        <div className='container mx-auto px-4 py-8'>

       <h2 className="text-2xl font-roboto font-medium my-6">
              Slide Presentation
            </h2>
      <div className=" mx-auto pb-10 grid xl:grid-cols-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4  ">
        {
          Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full bg-gray-300 aspect-video mx-auto" />
          ))
        }
        </div>
      </div>
      </Wrapper>
    </div>
    )
}

export default loading