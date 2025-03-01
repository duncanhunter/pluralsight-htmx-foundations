import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import Database from 'better-sqlite3';

const app = new Hono();
const db = new Database('./db/database.sqlite');

app.get('/', async (c) => {
  const todos = await db.prepare(" SELECT * FROM todos ORDER BY id DESC").all();

  return c.html(`
    <!DOCTYPE html>
      <html lang="en">
          <head>
              <meta name="viewport" content="width=device-width">
              <meta name="description" content="htmx todos">
              <title>Pluralsight HTMX Foundation</title>
          </head>
          <body>
            <form method="post" action="/">
              <input name="name" placeholder="New todo" required autocomplete="off">
              <button type="submit">Add</button>
            </form>
            <ul>
                ${todos.map(todo => `
                  <li>${todo.name}
                    <a href="/delete/${todo.id}">delete</a>
                  </li>
                `).join('')}
             </ul>
            <div><span id="todo-count">${todos.length}</span> items left</div>
          </body>
      <html>
  `);
});

app.post("/", async (c) => {
  const { name } = await c.req.parseBody();
  const { lastInsertRowid } = await db.prepare("INSERT INTO todos (name) VALUES (?)").bind(name).run();

  return c.redirect("/");
});

app.get("/delete/:id", async (c) => {
  const id = c.req.param("id");
  await db.prepare("DELETE FROM todos WHERE id = ?").bind(id).run();

  return c.redirect("/");
});

serve({
  fetch: app.fetch,
  port: 3000
});
