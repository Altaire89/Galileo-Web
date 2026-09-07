export type Role = "PLATFORM_ADMIN" | "ORG_ADMIN" | "MEMBER"

export type RequestType = "Incidencia" | "Consulta" | "Petición"
export type Urgency = "Baja" | "Media" | "Alta" | "Crítica"
export type Status = "Abierta" | "En progreso" | "Resuelta" | "Cerrada"

export const REQUEST_TYPES: RequestType[] = ["Incidencia", "Consulta", "Petición"]
export const URGENCIES: Urgency[] = ["Baja", "Media", "Alta", "Crítica"]
export const STATUSES: Status[] = ["Abierta", "En progreso", "Resuelta", "Cerrada"]

export interface User {
  id: string
  org_id: string
  email: string
  name: string
  role: Role
  group_ids?: string[]
  active: boolean
  created_at: string
}

export interface Attachment {
  name: string
  size: number
}

export interface Message {
  id: string
  request_id: string
  author_id: string
  author_name: string
  author_role: Role
  body: string
  attachments: Attachment[]
  created_at: string
}

export interface RequestSummary {
  id: string
  org_id: string
  group_id: string
  title: string
  type: RequestType
  urgency: Urgency
  status: Status
  created_by: string
  created_by_name: string
  created_at: string
  updated_at: string
  message_count: number
  last_message: string
  last_activity: string
}

export interface RequestDetail extends RequestSummary {
  messages: Message[]
}

export interface Invitation {
  id: string
  org_id: string
  email: string
  role: Role
  group_ids: string[]
  token?: string
  accepted: boolean
  created_at: string
}

export interface Group {
  id: string
  org_id: string
  name: string
  active: boolean
  member_count: number
  member?: boolean
  member_ids: string[]
  manager_ids: string[]
}
