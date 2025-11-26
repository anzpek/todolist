import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from './AuthContext'

interface CustomHoliday {
    id: string
    date: string // YYYY-MM-DD
    name: string
    isRecurring?: boolean
    createdAt: Timestamp
}

interface CustomHolidayContextType {
    customHolidays: CustomHoliday[]
    addCustomHoliday: (date: string, name: string, isRecurring: boolean) => Promise<void>
    deleteCustomHoliday: (id: string) => Promise<void>
    getCustomHoliday: (date: Date) => CustomHoliday | undefined
    loading: boolean
}

const CustomHolidayContext = createContext<CustomHolidayContextType | undefined>(undefined)

export const CustomHolidayProvider = ({ children }: { children: ReactNode }) => {
    const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>([])
    const [loading, setLoading] = useState(true)
    const { currentUser } = useAuth()

    useEffect(() => {
        if (!currentUser) {
            setCustomHolidays([])
            setLoading(false)
            return
        }

        const q = query(
            collection(db, `users/${currentUser.uid}/custom_holidays`),
            orderBy('date', 'asc')
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const holidays = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as CustomHoliday[]
            setCustomHolidays(holidays)
            setLoading(false)
        }, (error) => {
            console.error('Error fetching custom holidays:', error)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [currentUser])

    const addCustomHoliday = async (date: string, name: string, isRecurring: boolean = false) => {
        if (!currentUser) return

        try {
            await addDoc(collection(db, `users/${currentUser.uid}/custom_holidays`), {
                date,
                name,
                isRecurring,
                createdAt: serverTimestamp()
            })
        } catch (error) {
            console.error('Error adding custom holiday:', error)
            throw error
        }
    }

    const deleteCustomHoliday = async (id: string) => {
        if (!currentUser) return

        try {
            await deleteDoc(doc(db, `users/${currentUser.uid}/custom_holidays`, id))
        } catch (error) {
            console.error('Error deleting custom holiday:', error)
            throw error
        }
    }

    const getCustomHoliday = (date: Date) => {
        return customHolidays.find(holiday => {
            const holidayDate = new Date(holiday.date)
            // 시간 정보를 제거하고 날짜만 비교
            holidayDate.setHours(0, 0, 0, 0)
            const targetDate = new Date(date)
            targetDate.setHours(0, 0, 0, 0)

            return holidayDate.getTime() === targetDate.getTime()
        })
    }

    return (
        <CustomHolidayContext.Provider value={{
            customHolidays,
            addCustomHoliday,
            deleteCustomHoliday,
            getCustomHoliday,
            loading
        }}>
            {children}
        </CustomHolidayContext.Provider>
    )
}

export const useCustomHolidays = () => {
    const context = useContext(CustomHolidayContext)
    if (context === undefined) {
        throw new Error('useCustomHolidays must be used within a CustomHolidayProvider')
    }
    return context
}
