import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

const REMOTE_VERSION_URL = 'https://anzpek.github.io/todolist/version.json'

interface VersionData {
    version: string
    build: number
    forceUpdate?: boolean
}

export const useUpdateCheck = () => {
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
    const [currentVersion, setCurrentVersion] = useState<string>('')

    useEffect(() => {
        const checkVersion = async () => {
            try {
                // 1. Get Local Version
                const localResponse = await fetch('/version.json')
                const localData: VersionData = await localResponse.json()
                setCurrentVersion(localData.version)

                // Only check for updates on native platform or if explicitly requested
                if (!Capacitor.isNativePlatform() && window.location.hostname !== 'localhost') {
                    return
                }

                // 2. Get Remote Version
                const remoteResponse = await fetch(REMOTE_VERSION_URL, { cache: 'no-store' })
                if (!remoteResponse.ok) return

                const remoteData: VersionData = await remoteResponse.json()

                // 3. Compare (Check build number first, then version string)
                if (remoteData.build > localData.build) {
                    setIsUpdateAvailable(true)
                }
            } catch (error) {
                console.error('Failed to check for updates:', error)
            }
        }

        checkVersion()
    }, [])

    return { isUpdateAvailable, currentVersion }
}
