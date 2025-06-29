/*
# Todos "App"
- Creates a json file to read/write todos
- Allows to add, toggle, and remove todos
- Demonstrates using "onTab" and advanced "arg" features
*/

// Name: Todos "App"
// Description: Create/read/update/delete db example
// Author: John Lindquist
// Twitter: @johnlindquist

import '@johnlindquist/kit'

interface Todo {
  name: string
  done: boolean
  id: string
}

// "kv" is a key/value store
// The name "todos" will map to ~/.kenv/db/todos.json
// The object will be the initial value
const kv = await store('todos', { todos: [] })
let defaultChoiceId: string = ''

// The input allows you to maintain input when switching tabs
const toggleTab = async (input: string = '') => {
  const todos: Todo[] = (await kv.get<{ todos: Todo[] }>('todos'))?.todos || []
  const toggleTodos = todos.map(t => {
    return {
      ...t,
      enter: 'Toggle Todo',
      name: `${t.done ? '✅' : '❌'} ${t.name}`,
    }
  })
  const choices = [
    ...toggleTodos,
    {
      name: 'Add Todo',
      miss: true,
      info: true,
    },
  ]
  const todo = await micro<Todo>(
    {
      input,
      placeholder: todos.length ? 'Add Todo' : 'Toggle Todo',
      defaultChoiceId,
      // disabling "strict" allows you to submit the input when no choices are available
      strict: false,
      onChoiceFocus: (input: string, { focused }) => {
        // defaultValue allows you to maintain the selected choice when switching tabs
        defaultChoiceId = focused?.id || ''
        setEnter('Toggle Todo')
      },
      onNoChoices: (input: string) => {
        setEnter('Add Todo')
      },
    },
    choices
  )

  // "todo" was the string input
  if (typeof todo === 'string') {
    todos.push({
      name: todo,
      done: false,
      id: uuid(),
    })
  }
  // "todo" was the selected object
  else if (todo?.id) {
    const foundTodo = todos.find(({ id }) => id === todo.id)
    if (foundTodo) {
      foundTodo.done = !foundTodo.done
    }
  }

  await kv.set('todos', { todos })
  await toggleTab()
}

const removeTab = async (input: string = '') => {
  const todos: Todo[] = (await kv.get<{ todos: Todo[] }>('todos'))?.todos || []
  const todo = await micro<Todo>(
    {
      input,
      defaultChoiceId,
      placeholder: 'Remove Todo',
      enter: 'Remove Todo',
      onChoiceFocus: (input: string, { focused }) => {
        defaultChoiceId = focused?.id || ''
      },
    },
    [
      ...todos.map(t => {
        return {
          ...t,
          enter: 'Toggle Todo',
          name: `${t.done ? '✅' : '❌'} ${t.name}`,
        }
      }),
      {
        name: todos.length ? 'No Matches' : 'No Todos',
        miss: true,
        info: true,
      },
    ]
  )
  // Remove the todo from the array
  const index = todos.findIndex(t => t.id === todo.id)

  todos.splice(index, 1)
  await kv.set('todos', { todos })
  await removeTab()
}

onTab('Toggle', toggleTab)
onTab('Remove', removeTab)
