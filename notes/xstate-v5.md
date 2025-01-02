## XState v5 API-Focused Guide

### Core Concepts (Brief)

*   **Actors:** Independent units with their own state, sending/receiving events.
*   **State Machines:** One way to define actor behavior using states and transitions.
*   **Event-Driven:** Actors communicate via events (messages).

### Key API Changes & Usage

*   **`createMachine(config)`:**
    *   **Replaces:** `Machine(config)` from v4.
    *   **Usage:**  Used for defining state machine actors.
    *   **Example:**
        ```typescript
        import { createMachine } from 'xstate';
        const myMachine = createMachine({
           id: 'myMachine',
           initial: 'idle',
           states: {
             idle: { on: { START: 'loading' } },
             loading: { on: { SUCCESS: 'success' } },
             success: {}
           }
        });
        ```
*   **`fromPromise(promiseCreator)`:**
    *   **Usage:** Creates an actor from a Promise.
    *  **Example:**
        ```typescript
         import { fromPromise } from 'xstate';
         const fetchUser = fromPromise(async ({ input }) => {
           const response = await fetch(`/users/${input}`);
           return await response.json();
         });
       ```
*   **`fromObservable(observableCreator)`:**
    *   **Usage:** Creates an actor from an Observable.
    * **Example:**
        ```typescript
        import { fromObservable } from 'xstate';
        import { fromEvent } from 'rxjs';

        const clickActor = fromObservable(() => {
          return fromEvent(document, 'click');
        });
        ```
*    **`fromCallback(callback)`:**
     *   **Usage:** Creates an actor from a callback.
     *  **Example:**
        ```typescript
        import { fromCallback } from 'xstate';
        const myCallbackActor = fromCallback(({ send }) => {
           //do something here, then call send
           send({ type: 'DONE' })
         });
         ```
*   **`spawn(actorLogic, options)` or `spawnChild(actorLogic, options)` Action:**
    *   **Replaces:** `spawn` from context in v4.
    *   **Usage:**  Spawns (creates) new actors from within other actors. `spawn` is used inside `assign` action and `spawnChild` is used as a separate action.
    *  **Example:**
        ```typescript
         import { createMachine, assign, spawn } from 'xstate';
         const parentMachine = createMachine({
           id: 'parent',
           initial: 'active',
           context: {
             child: null,
           },
           states: {
             active: {
               entry: assign({
                 child: () => {
                   return spawn(someChildMachine);
                 }
              })
             },
           },
         });
        import { createMachine, spawnChild } from 'xstate';
        const parentMachine = createMachine({
           id: 'parent',
           initial: 'active',
           states: {
             active: {
              entry: spawnChild(someChildMachine, { id: 'child' })
              }
             },
           },
         });
        ```
*   **`assign(assignment)` Action:**
    *   **Usage:**  Used for updating context within machines.
    *   **Example:**
        ```typescript
        import { createMachine, assign } from 'xstate';
        const counterMachine = createMachine({
          id: 'counter',
          initial: 'active',
          context: {
             count: 0
           },
          states: {
            active: {
              on: {
                INC: {
                 actions: assign({ count: (context) => context.count + 1 })
                }
              }
            }
           },
        });
        ```
*   **`setup(config)`:**
    *   **Usage:** Replaces the `types` and `implementations` objects in the machine definition. Used to define types, actions, services and guards, and allows better type inference.
    *   **Example:**
        ```typescript
        import { createMachine, assign } from 'xstate';

        const myMachine = createMachine({
          id: 'myMachine',
          initial: 'idle',
          context: { count: 0 },
          states: {
            idle: { on: { START: 'active' } },
            active: {
              entry: assign({ count: 1})
            }
          }
        }, {
          actions: {
            assign(data) {
              return assign(data);
            }
          }
        });
        ```
*   **Parameterized Actions & Guards:**
    *   **Usage:** Instead of string actions/guards, use objects for type safety and parameters.
    *   **Example:**
        ```typescript
        // Before (v4)
        {
          transition: {
            target: 'success',
            actions: 'myAction'
          }
        }
        //After (v5)
        {
           transition: {
             target: 'success',
             actions: { type: 'myAction', value: 'some value' }
          }
        }

        ```
*  **`send(event)`:**
    *  **Usage:** Used to send events to actors
    *  **Example:**
        ```typescript
        import { createMachine, assign, send } from 'xstate';
        const parentMachine = createMachine({
           id: 'parent',
           initial: 'active',
           context: {
             child: null,
           },
           states: {
             active: {
               entry: assign({
                 child: () => {
                   return spawn(someChildMachine);
                 }
               }),
               always: {
                 actions: send({type: 'CHILD.EVENT'}, { to: (ctx) => ctx.child})
               }
             },
           },
         });
        ```
*   **`invoke`:**
    *   **Usage:** Declares that an actor will be invoked (spawned and integrated with the machine)
    *   **Example:**
        ```typescript
        import { createMachine, assign } from 'xstate';
        const parentMachine = createMachine({
           id: 'parent',
           initial: 'active',
          states: {
             active: {
               invoke: {
                  id: 'child',
                  src: someChildMachine,
                  onDone: 'success'
               }
              },
             success: {}
           },
         });
        ```

### Key Removals/Changes

*   **Activities:** Deprecated. Use invoked actors instead.
*  **`Machine()`:** Replaced by `createMachine()`.
* **`types`, `implementations`**: Replaced with `setup()`

### Best Practices (API Focused)

*   **Use `createMachine`:** Always use `createMachine` instead of `Machine`.
*   **Parameterized Actions:** Make actions and guards parameterized.
*   **Use `setup()`:** Define types, actions, guards and services in `setup()`.
*   **Spawn Actors:** Use `spawn` or `spawnChild` for creating new actors.
*   **Explicit Type Safety:** Leverage Typescript and make use of types in `setup()`.

