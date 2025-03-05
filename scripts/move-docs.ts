import '@johnlindquist/kit'

const newDocs = await globby(home('dev', 'kit', '*.md'))
// console.log(JSON.stringify(newTypes, null, 2))

const oldDocs = await globby(path.resolve('prompts', '*.md'))
// console.log(JSON.stringify(oldTypes, null, 2))

// only copy new types that already exist in oldTypes. Match the file name for comparison
const newDocsToCopy = newDocs.filter(newDoc => {
  const newFileName = path.parse(newDoc).base
  return oldDocs.some(oldDoc => path.parse(oldDoc).base === newFileName)
})

for await (const doc of newDocsToCopy) {
  const docName = path.parse(doc).base
  const docPath = path.join('prompts', docName)
  console.log(`Copying ${doc} to ${docPath}`)
  await cp('-u', doc, docPath)
}
