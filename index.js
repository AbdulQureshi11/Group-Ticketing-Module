import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cors from 'cors'
import dotenv from 'dotenv'
import { sequelize } from './src/config/database.js'
import { User, Agency } from './src/database/index.js'

dotenv.config()

const app = express()
const port = 9000

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  // Development fallback - change this in production
  JWT_SECRET = 'dev-jwt-secret-key-change-in-production';
}

// Initialize database
sequelize.authenticate().then(() => {
  console.log('✅ Database connected in index.js')
}).catch(err => {
  console.error('❌ Database connection failed:', err)
  process.exit(1)
})

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/login', async (req, res) => {
  const { agencyCode, username, password } = req.body
  if (!agencyCode || !username || !password) {
    return res.status(400).json({ message: 'Missing required fields: agencyCode, username, password' })
  }
  try {
    const user = await User.findOne({
      where: {
        username: username,
        isActive: true
      },
      include: [{
        model: Agency,
        as: 'agency',
        where: {
          code: agencyCode,
          status: 'ACTIVE'
        }
      }]
    })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    const token = jwt.sign({ username: user.username, role: user.role, agencyId: user.agencyId }, JWT_SECRET, { expiresIn: '1h' })
    res.json({ token })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
