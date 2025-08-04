import express from 'express'
import usersRouter from './routes/users'
import attendanceRouter from './routes/attendance'
import infoRouter from './routes/info'
import cors from 'cors'

const app = express()
const port = process.env.PORT || 3000

// CORSを許可（全てのオリジンを許可）
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello from Node.js + TypeScript!')
})

app.use('/api/users', usersRouter)
app.use('/api/attendance', attendanceRouter)
app.use('/api/info', infoRouter)

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
