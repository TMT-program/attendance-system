import 'dotenv/config'
import express from 'express'
import usersRouter from './routes/users'
import attendanceRouter from './routes/attendance'
import aiRouter from './routes/ai'
import infoRouter from './routes/info'
import knowledgeRouter from './routes/knowledge'
import cors from 'cors'

const app = express()
const port = process.env.PORT || 3000

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://attendance-system-eight-iota.vercel.app',
]
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello from Node.js + TypeScript!')
})

app.use('/api/users', usersRouter)
app.use('/api/attendance', attendanceRouter)
app.use('/api/info', infoRouter)
app.use('/api/ai', aiRouter)
app.use('/api/knowledge', knowledgeRouter)

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
