import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import Database from 'better-sqlite3';

const app = new Hono()
const db = new Database('./db/database.sqlite');

app.get('/', async (c) => {
  const todos = await db.prepare("SELECT * FROM todos").all();

  return c.html(`
    <!DOCTYPE html>
      <html lang="en">
          <head>
              <meta name="viewport" content="width=device-width">
              <meta name="description" content="htmx todos">
              <title>Pluralsight HTMX Foundation</title>
              <script src="https://unpkg.com/htmx.org@2.0.4" integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+" crossorigin="anonymous"></script>    
          </head>
          <body>
            <form
              hx-post="/"
              hx-target="next ul"
              hx-swap="afterbegin"
            >
              <input name="name" placeholder="New todo" required autocomplete="off">
              <button type="submit">Add</button>
            </form>
            <ul>
              ${todos.map(todo => `
                <li>${todo.name}
                  <button
                    hx-delete="/${todo.id}"
                    hx-swap="outerHTML"
                    hx-target="closest li">
                      delete
                  </button>
                </li>
                `).join('')}
            </ul>
          </body>
      <html>
  `);
})

app.post("/", async (c) => {
  const { name } = await c.req.parseBody();
  const { lastInsertRowId } = await db.prepare("INSERT INTO todos (name) VALUES (?)").bind(name).run();

  return c.html(`
    <li>${name}
      <button
        hx-delete="/${lastInsertRowId}"
        hx-swap="outerHTML"
        hx-target="closest li">
          delete
      </button>
    </li>
  `);
});

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.prepare("DELETE FROM todos WHERE id = ?").bind(id).run();

  return c.body(null);
});

serve({
  fetch: app.fetch,
  port: 3000
});
