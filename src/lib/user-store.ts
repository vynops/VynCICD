import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export type UserRole = 'admin' | 'editor' | 'viewer'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  passwordHash: string
  passwordSalt: string
  createdAt: string
  active: boolean
  lastLogin?: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readUsers(): User[] {
  ensureDir()
  if (!fs.existsSync(USERS_FILE)) return []
  try {
    return (JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) as User[]).map(user => ({ ...user, active: user.active !== false }))
  } catch { return [] }
}

function writeUsers(users: User[]) {
  ensureDir()
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8')
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')
  return { hash, salt }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'))
}

export function listUsers(): User[] { return readUsers() }

export function findUserByEmail(email: string): User | null {
  return readUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null
}

export function findUserById(id: string): User | null {
  return readUsers().find(u => u.id === id) ?? null
}

export function createUser(data: { email: string; name: string; role: UserRole; password: string }): User {
  const users = readUsers()
  if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) throw new Error('Email already exists')
  const { hash, salt } = hashPassword(data.password)
  const user: User = {
    id: crypto.randomUUID(),
    email: data.email,
    name: data.name,
    role: data.role,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: new Date().toISOString(),
    active: true,
  }
  users.push(user)
  writeUsers(users)
  return user
}

export function updateUser(id: string, updates: Partial<Pick<User, 'name' | 'role' | 'active'> & { password?: string }>): User {
  const users = readUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) throw new Error('User not found')
  if (updates.name) users[idx].name = updates.name
  if (updates.role) users[idx].role = updates.role
  if (updates.active !== undefined) {
    const activeAdmins = users.filter(user => user.role === 'admin' && user.active)
    if (!updates.active && users[idx].role === 'admin' && activeAdmins.length <= 1) throw new Error('Cannot deactivate the last active admin')
    users[idx].active = updates.active
  }
  if (updates.password) {
    const { hash, salt } = hashPassword(updates.password)
    users[idx].passwordHash = hash
    users[idx].passwordSalt = salt
  }
  writeUsers(users)
  return users[idx]
}

export function deleteUser(id: string): void {
  const users = readUsers()
  const user = users.find(u => u.id === id)
  if (!user) throw new Error('User not found')
  const admins = users.filter(u => u.role === 'admin')
  if (user.role === 'admin' && admins.length <= 1) throw new Error('Cannot delete the last admin')
  writeUsers(users.filter(u => u.id !== id))
}

/** Seeds a default admin user if no users exist */
export function seedDefaultAdmin(): void {
  const users = readUsers()
  if (users.length > 0) return
  const email    = process.env.VYNCICD_ADMIN_EMAIL    ?? 'admin@vyncicd.local'
  const password = process.env.VYNCICD_ADMIN_PASSWORD ?? 'changeme'
  const { hash, salt } = hashPassword(password)
  const admin: User = {
    id: crypto.randomUUID(),
    email,
    name: 'Admin',
    role: 'admin',
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: new Date().toISOString(),
    active: true,
  }
  writeUsers([admin])
}
