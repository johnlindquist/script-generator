import Meta from '../components/Meta'

export default function OGTest() {
  return (
    <div className="p-8">
      <Meta
        title="Test OpenGraph Image"
        description="Testing our OpenGraph implementation"
        user="johnlindquist"
        author="John Lindquist"
      />
      <h1 className="text-2xl font-bold mb-4">OpenGraph Test Page</h1>
      <div className="space-y-4">
        <p>You can test the OpenGraph endpoints directly:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <a
              href="/api/opengraph?title=Test Title"
              target="_blank"
              className="text-blue-500 hover:underline"
            >
              Test Direct OG Image Generation
            </a>
          </li>
          <li>
            <a
              href="/api/cloudinary-cache?title=Test Title&user=johnlindquist"
              target="_blank"
              className="text-blue-500 hover:underline"
            >
              Test Cloudinary Cached Version
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
