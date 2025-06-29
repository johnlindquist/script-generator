import '@johnlindquist/kit'
import { getDiscussions, Category } from '../src/lib/get-discussions.js'

const run = async () => {
  console.log(`Starting discussion json generation:`)

  const jsonfile = await npm('jsonfile')
  const docs = await getDiscussions(Category.Guide)
  const outfile = path.resolve(`./public/data/docs.json`)
  await jsonfile.writeFile(outfile, docs)

  console.log(`Docs written to json: ${outfile} 👏`)
}

run()
