import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'repeattree',
  eventKey: process.env.INNGEST_EVENT_KEY,
})
