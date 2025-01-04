import { NextApiRequest, NextApiResponse } from 'next'
import { getSponsors } from '../../lib/get-sponsors'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const sponsors = await getSponsors()
    res.status(200).json(sponsors)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error fetching preview sponsors' })
  }
}
