import React from 'react'
import { ConfigurationInitializer } from '../ConfigurationInitializer'
const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <ConfigurationInitializer>
        {children}
      </ConfigurationInitializer>
    </div>
  )
}

export default layout
