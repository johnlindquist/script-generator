import '@johnlindquist/kit'

const newTypes = await globby(home('dev', 'kit', 'src', 'types'))
// console.log(JSON.stringify(newTypes, null, 2))

const oldTypes = await globby(path.resolve('kit', 'types'))
// console.log(JSON.stringify(oldTypes, null, 2))

// only copy new types that already exist in oldTypes. Match the file name for comparison
const newTypesToCopy = newTypes.filter(newType => {
  const newFileName = path.parse(newType).base
  return oldTypes.some(oldType => path.parse(oldType).base === newFileName)
})

for await (const type of newTypesToCopy) {
  const typeName = path.parse(type).base
  const typePath = path.join('kit', 'types', typeName)
  console.log(`Copying ${type} to ${typePath}`)
  await cp('-u', type, typePath)
}
