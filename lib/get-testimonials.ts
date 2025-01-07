import { Testimonial } from '@/types/testimonial'
import testimonials from '../public/data/testimonials.json'

export function getTestimonials(): Testimonial[] {
  return testimonials as Testimonial[]
}
