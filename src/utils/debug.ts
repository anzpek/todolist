// Debug utility for production-safe logging
const isDevelopment = import.meta.env.DEV

export const debug = {
  log: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(message, data)
    }
  },
  
  warn: (message: string, data?: any) => {
    if (isDevelopment) {
      console.warn(message, data)
    }
  },
  
  error: (message: string, error?: any) => {
    // Always log errors, but sanitize in production
    if (isDevelopment) {
      console.error(message, error)
    } else {
      console.error(message, error?.message || error)
    }
  },
  
  info: (message: string, data?: any) => {
    if (isDevelopment) {
      console.info(message, data)
    }
  },
  
  // For performance tracking
  time: (label: string) => {
    if (isDevelopment) {
      console.time(label)
    }
  },
  
  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label)
    }
  }
}