import express from 'express'
import cors from 'cors'
import usersRouter from './routes/users'
import attendanceRouter from './routes/attendance'
import aiRouter from './routes/ai'
import infoRouter from './routes/info'
import knowledgeRouter from './routes/knowledge'
import { slackRouter } from './routes/slack'

const app = express()

// Slack は独自のボディパーサーを持つため express.json() より先にマウントする
app.use(slackRouter)

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

app.get('/', (_req, res) => {
  res.send('Hello from Node.js + TypeScript!')
})

app.use('/api/users', usersRouter)
app.use('/api/attendance', attendanceRouter)
app.use('/api/info', infoRouter)
app.use('/api/ai', aiRouter)
app.use('/api/knowledge', knowledgeRouter)

export default app
