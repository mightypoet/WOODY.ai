import React, { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export default function Todos() {
  const [todos, setTodos] = useState<any[]>([])

  useEffect(() => {
    async function getTodos() {
      const { data: todos } = await supabase.from('todos').select()

      if (todos) {
        setTodos(todos)
      }
    }

    getTodos()
  }, [])

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Supabase Todos</h2>
      <ul className="space-y-2">
        {todos.map((todo) => (
          <li key={todo.id} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
            {todo.name}
          </li>
        ))}
      </ul>
      {todos.length === 0 && <p className="text-zinc-500">No todos found or table does not exist yet.</p>}
    </div>
  )
}
