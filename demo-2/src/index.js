import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import Database from 'better-sqlite3';

const app = new Hono();
const db = new Database('./db/database.sqlite');

app.get('/', async (c) => {
  const todos = await db.prepare("SELECT * FROM todos ORDER BY id DESC").all();

  return c.html(`
    <!DOCTYPE html>
      <html lang="en">
          <head>
              <meta name="viewport" content="width=device-width">
              <meta name="description" content="htmx todos">
              <title>Pluralsight htmx Foundations</title>
              <script src="https://unpkg.com/htmx.org@2.0.4" integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+" crossorigin="anonymous"></script>
              <style>
                .deleting, .loading {
                  display: none;
                }
                .htmx-request.deleting,
                .htmx-request.loading {
                  display: inline
                }
              </style>
          </head>
          <body>
            <form
              hx-indicator=".loading"
              hx-target="next ul"
              hx-swap="afterbegin"
              hx-post="/">
                <input name="name" placeholder="New todo" required autocomplete="off">
                <button type="submit">Add</button>
            </form>
            <div id="error"></div>
            <ul>
                ${todos.map(todo => `
                  <li>${todo.name}
                    <button
                      hx-indicator=".deleting"
                      hx-target="closest li"
                      hx-swap="outerHTML"
                      hx-delete="/${todo.id}">
                        delete
                    </button>
                  </li>
                `).join('')}
                <div class="deleting">deleting...</div>
                <div class="loading">loading...</div>
            </ul>
            <div><span hx-trigger="todoDeleted from:body, todoAdded from:body" hx-get="/todo-count" id="todo-count">${todos.length}</span> items left</div>
          </body>
      <html>
  `);
});

app.post("/", async (c) => {
  const { name } = await c.req.parseBody();
  const existingTodo = await db.prepare("SELECT * FROM todos WHERE name = ?").get(name);

  if (existingTodo) {
    return c.html(`<div id="error" hx-swap-oob="true" style="color:red;">Todo already exists</div>`)
  }

  const { lastInsertRowid } = await db.prepare("INSERT INTO todos (name) VALUES (?)").bind(name).run();

  return c.html(`
    <div id="error" hx-swap-oob="true" style="color:red;"></div>
    <li>${name}
      <button
        hx-target="closest li"
        hx-swap="outerHTML"
        hx-delete="/${lastInsertRowid}">
          delete
      </button>
    </li>
    `, 201, { "HX-Trigger": "todoAdded" });
});

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.prepare("DELETE FROM todos WHERE id = ?").bind(id).run();

  return c.body(null, 201, { "HX-Trigger": "todoDeleted" });
});

app.get("/todo-count", async (c) => {
  const todos = await db.prepare("SELECT * FROM todos ORDER BY id DESC").all();

  return c.html(todos.length);
});

serve({
  fetch: app.fetch,
  port: 3000
});
