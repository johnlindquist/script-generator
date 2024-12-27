# Script Generator

An AI-powered shell script generator built with Next.js, Prisma, and Google's Gemini model.

## Features

- Generate shell scripts using natural language descriptions
- GitHub authentication
- Save and browse generated scripts
- Star your favorite scripts
- Copy scripts to clipboard
- Responsive design

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Prisma ORM
- PostgreSQL (Vercel Postgres)
- NextAuth.js for authentication
- Google Gemini AI model
- Tailwind CSS

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/script-generator.git
   cd script-generator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with:
   ```
   DATABASE_URL="your-postgres-url"
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"
   GEMINI_API_KEY="your-gemini-api-key"
   NEXTAUTH_SECRET="your-nextauth-secret"
   ```

4. Initialize the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

The app is designed to be deployed on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add the environment variables in Vercel's project settings
4. Deploy!

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
