import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cors from 'cors'

const app = express()
const port = 9000

const JWT_SECRET = 'your-secret-key' // Change this to a secure key

// Sample user data
const users = [
  {
    username: 'admin',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // Hashed 'password'
  }
]

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/login', async (req, res) => {
  const { username, password } = req.body
  const user = users.find(u => u.username === username)
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' })
  res.json({ token })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
