import { Testimonial } from '@/types/testimonial'
import Image from 'next/image'

// Static imports for testimonial images
import kentcdoddsImage from '@/public/assets/testimonials/kentcdodds.jpg'
import mattpocockukImage from '@/public/assets/testimonials/mattpocockuk.jpg'
import erikrasImage from '@/public/assets/testimonials/erikras.jpg'
import slutskytomImage from '@/public/assets/testimonials/slutskytom.jpg'

// Map of handles to their static images
const testimonialImages = {
  kentcdodds: kentcdoddsImage,
  mattpocockuk: mattpocockukImage,
  erikras: erikrasImage,
  SlutskyTom: slutskytomImage,
}

function formatReview(review: string) {
  const parts = review.split(/(\[@\w+\]\([^)]+\))/g)
  return parts.map((part, index) => {
    const match = part.match(/\[@(\w+)\]\(([^)]+)\)/)
    if (match) {
      const [, handle, url] = match
      return (
        <a
          key={index}
          href={url}
          className="text-blue-400 hover:text-blue-300"
          target="_blank"
          rel="noopener noreferrer"
        >
          @{handle}
        </a>
      )
    }
    return part
  })
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="block p-6 rounded-lg bg-zinc-800/50">
      <div className="flex items-start space-x-4">
        <a
          href={testimonial.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <Image
            src={testimonialImages[testimonial.handle as keyof typeof testimonialImages]}
            alt={testimonial.name}
            width={48}
            height={48}
            className="rounded-full"
            priority
          />
        </a>
        <div>
          <a
            href={testimonial.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400 transition-colors"
          >
            <h3 className="font-semibold text-white">{testimonial.name}</h3>
            <p className="text-zinc-400">@{testimonial.handle}</p>
          </a>
          <div className="mt-2 text-zinc-200">{formatReview(testimonial.review)}</div>
        </div>
      </div>
    </div>
  )
}

export default function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <div className="py-12">
      <h2 className="text-3xl font-bold text-center mb-8 text-white">What People Are Saying</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testimonials.map(testimonial => (
          <TestimonialCard key={testimonial.handle} testimonial={testimonial} />
        ))}
      </div>
    </div>
  )
}
