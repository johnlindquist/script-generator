export interface User {
  username: string | null
  fullName: string | null
}

export interface Sponsor {
  login: string
  user: User | null
}

export interface Position {
  x: number
  y: number
  opacity: number
}
