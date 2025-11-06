const response =
  await Bun.$`cursor-agent --model cheetah --print "Write a joke about a turtle"`.text()

console.log(response)
