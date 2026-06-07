import type { ReactNode } from "react"

export type CurrentUser = {
    name: string
    email: string
    avatar: string
}

export type NavItem = {
    title: string
    url: string
    icon: React.JSX.Element
}

export type DocumentItem = {
    name: string
    url: string
    icon: ReactNode
}

export type NavCloudItem = {
    title: string
    url: string
    icon: React.JSX.Element
    isActive?: boolean
    items: {title: string, url: string}[]
}

export type SideBarItem = {
    user: CurrentUser
    navMain: NavItem[]
    navClouds: NavCloudItem[]
    navSecondary: NavItem[]
    documents: DocumentItem[]
}

export type ApiResponse<T> = {
    status: number
    data: T
    message?: string
    error?: ApiError
}

type ApiError = {
    code: string
    message: string
    details?: any[]
}