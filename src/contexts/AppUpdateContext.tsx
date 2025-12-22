import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { AppUpdate, type AppUpdateInfo } from '@capawesome/capacitor-app-update'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'

interface AppUpdateContextType {
    checkForUpdate: () => Promise<void>
}

const AppUpdateContext = createContext<AppUpdateContextType | null>(null)

export const useAppUpdate = () => {
    const context = useContext(AppUpdateContext)
    if (!context) {
        throw new Error('useAppUpdate must be used within an AppUpdateProvider')
    }
    return context
}

export const AppUpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const checkForUpdate = useCallback(async () => {
        if (!Capacitor.isNativePlatform()) return

        if (Capacitor.getPlatform() === 'android') {
            try {
                const appUpdateInfo: AppUpdateInfo = await AppUpdate.getAppUpdateInfo()

                // 업데이트 가능 여부 확인 (UpdateAvailability.UPDATE_AVAILABLE = 2)
                if (appUpdateInfo.updateAvailability === 2) {
                    console.log('🚀 Android In-App Update available. Starting immediate update flow.')

                    // IMMEDIATE(1) 방식으로 즉시 업데이트 실행
                    await AppUpdate.performImmediateUpdate()
                } else {
                    console.log('✅ Android App is up to date (or update not allowed). Availability:', appUpdateInfo.updateAvailability)
                }
            } catch (error) {
                console.error('❌ Android In-App Update check failed:', error)
            }
        } else if (Capacitor.getPlatform() === 'ios') {
            try {
                // iOS는 In-App Update API가 없으므로 앱스토어 정보와 비교하거나
                // 간단히 App Store 이동 링크만 제공할 수도 있음
                // 여기서는 버전 비교 로직을 간단히 구현하거나 생략 가능
                // (Capacitor-App-Update 플러그인 iOS 지원 여부 확인 필요, 보통 iOS는 별도 로직)

                // 단순하게 Play Store/App Store 링크 열기 (수동 업데이트 유도 시)
                // 하지만 "자동" 요청이므로 iOS는 OS 자동 업데이트에 맡기는 것이 일반적
                console.log('iOS update check is handled by OS automatic updates or manual App Store visit')
            } catch (error) {
                console.error('❌ iOS Update check failed:', error)
            }
        }
    }, [])

    useEffect(() => {
        // 앱 시작 시 체크
        checkForUpdate()

        // 앱이 포그라운드로 돌아올 때마다 체크 (특히 Android IMMEDIATE 업데이트 중단 후 복귀 시 중요)
        const listener = App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
                checkForUpdate()
            }
        })

        return () => {
            listener.then(remove => remove.remove())
        }
    }, [checkForUpdate])

    return (
        <AppUpdateContext.Provider value={{ checkForUpdate }}>
            {children}
        </AppUpdateContext.Provider>
    )
}
