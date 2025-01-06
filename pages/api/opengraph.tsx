import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import '@fontsource/inter'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const hasTitle = searchParams.has('title')
    const title = hasTitle ? searchParams.get('title')?.slice(0, 100) : 'My Default Title'
    const hasUser = searchParams.has('user')
    const user = hasUser ? searchParams.get('user') : undefined
    const hasAuthor = searchParams.has('author')
    const author = hasAuthor ? searchParams.get('author') : undefined
    const logo = 'https://scriptkit.com/assets/kit-icon-1.png'

    return new ImageResponse(
      (
        <div
          style={{
            margin: 0,
            padding: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: 1200,
            height: 630,
            backgroundColor: '#000',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            tw="absolute"
            alt="Logo"
            style={{
              right: 100,
              top: 100,
            }}
          />
          <div
            tw="text-7xl"
            style={{
              position: 'absolute',
              top: 135,
              left: 100,
              width: 700,
              height: 130,
              color: '#ffffff',
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          {user && (
            <div tw="absolute left-24 bottom-24 flex items-center flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                width={100}
                height={100}
                tw="rounded-full"
                alt={`${user}'s avatar`}
                src={`https://github.com/${user}.png`}
              />
              <div tw="pl-4 text-white text-3xl flex">{author ? author : user}</div>
            </div>
          )}
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.log(`${error}`)
    return new Response(`Failed to generate the image`, {
      status: 500,
    })
  }
}
