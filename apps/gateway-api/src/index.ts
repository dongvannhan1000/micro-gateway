import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('[Nest] [GatewayService] Action: Server check (v1.0.0 Status: Ready)')
})

// Gateway Proxy logic will be implemented here
app.all('/v1/*', (c) => {
  return c.json({ message: 'Gateway Proxy placeholder' })
})

// Management API logic
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'micro-security-gateway' })
})

export default app
