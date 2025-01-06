import Head from 'next/head'
import { useRouter } from 'next/router'
import qs from 'query-string'

interface MetaProps {
  author?: string
  user?: string
  title: string
  twitter?: string
  description?: string
  backgroundImage?: string
}

export default function Meta({
  title,
  description,
  twitter = 'johnlindquist',
  user,
  author,
  backgroundImage = `/card@2x.png`,
}: MetaProps) {
  const query = {
    title,
    description,
    twitter,
    user,
    author,
    backgroundImage,
  }

  const router = useRouter()
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  const protocol = vercelUrl?.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${vercelUrl}`

  let opengraphImage = `${baseUrl}/api/cloudinary-cache?${qs.stringify(query)}`
  let defaultOgImage = `${baseUrl}/card@2x.png`
  let url = `${baseUrl}${router.asPath}`

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="icon" href="/favicon.ico" />

      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={opengraphImage} />
      {/* Fallback image in case the dynamic one fails */}
      <meta property="og:image" content={defaultOgImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={`@${twitter}`} />
      <meta name="twitter:creator" content={`@${twitter}`} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={opengraphImage} />
      {/* Fallback image in case the dynamic one fails */}
      <meta name="twitter:image" content={defaultOgImage} />
    </Head>
  )
}
