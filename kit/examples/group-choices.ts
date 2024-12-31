/*
# Group Choices

- Generates a list of names and job titles using the Faker library
- Each person is randomly assigned to a group corresponding to a FAANG company
- The list of people is then organized by their assigned group
- The user is prompted to select a person from the listed groups
- The script then displays the selected person
*/

// Name: Group Choices Sample

import '@johnlindquist/kit'
import { faker } from '@faker-js/faker'

interface Person {
  name: string
  value: string
  description: string
  group: string
}

let generatePeople = (): Person[] => {
  let faang: string[] = ['Facebook', 'Apple', 'Amazon', 'Netflix', 'Google']
  let sample = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

  return Array.from({ length: 22 }).map(() => {
    let name = faker.person.fullName()
    return {
      name,
      value: name,
      description: faker.person.jobTitle(),
      group: sample(faang), // Grouping by a random company
    }
  })
}

let storePath: string = kenvPath('db', 'people.json') // ~/.kenv/db/people.json
let peopleStore = await store(storePath)

let people: Person[] = await peopleStore.get('people')
if (!people) {
  people = generatePeople()
  await peopleStore.set('people', people)
}

// groupChoices is based on the "group" property of each person
let groupedChoices = groupChoices(people)

let result: string = await micro('Select a Person', groupedChoices)
await editor(result)
