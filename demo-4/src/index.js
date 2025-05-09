import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { serveStatic } from '@hono/node-server/serve-static'

const app = new Hono();
const db = new Database('./db/database.sqlite');

app.use('/static/*', serveStatic({ root: './' }))
app.get('/', async (c) => {
  return c.html(`
    <!DOCTYPE html>
      <html lang="en">
          <head>
              <meta name="viewport" content="width=device-width">
              <meta name="description" content="htmx todos">
              <title>Pluralsight htmx Foundations</title>
              <script src="https://unpkg.com/htmx.org@2.0.4" integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+" crossorigin="anonymous"></script>
              <script src="/static/todo-count.js"></script>
              <script src="/static/confirm-dialog.js"></script>
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
            <input
                type="search"
                name="searchText"
                placeholder="search..."
                hx-get="/search"
                hx-target="next ul"
                hx-indicator=".loading"
                hx-trigger="input changed delay:500ms, keyup[key=='ENTER'], load"/>
            <form
              hx-indicator=".loading"
              hx-target="next ul"
              hx-swap="afterbegin"
              hx-post="/"
              hx-on:htmx:after-request="if(event.detail.successful) this.reset()">
                <input name="name" placeholder="New todo" required autocomplete="off">
                <button type="submit">Add</button>
            </form>
            <div id="error"></div>
            <ul></ul>
            <div class="deleting">deleting...</div>
            <div class="loading">loading...</div>
            <div><span id="todo-count"></span> items left</div>
            <dialog id="confirm-dialog">
              <p id="confirm-message"></p>
              <button id="confirm-ok-button">Yes</button>
              <button id="confirm-cancel-button">No</button>
            </dialog>
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
        hx-delete="/${lastInsertRowid}"
        hx-confirm="Do you really want to delete me?">
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

app.get("/search", async (c) => {
  const { searchText, page = 1 } = await c.req.query();
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const todos = searchText
    ? db
      .prepare("SELECT * FROM todos WHERE name LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?")
      .all(`%${searchText}%`, pageSize, offset)
    : db.prepare(" SELECT * FROM todos ORDER BY id DESC LIMIT ? OFFSET ?").all(pageSize, offset);

  return c.html(`
   ${todos.map((todo, index) => `
       <li
        ${index === pageSize - 1 ? `
            hx-get="/search?page=${page + 1}"
            hx-trigger="revealed"
            hx-swap="afterend"
            hx-include="[name='searchText']"
        `: ''}
       >${todo.name}
         <button
           hx-indicator=".deleting"
           hx-target="closest li"
           hx-swap="outerHTML"
           hx-delete="/${todo.id}"
           hx-confirm="Do you really want to delete me?">
             delete
         </button>
       </li>
     `).join('')}
 `);
});

serve({
  fetch: app.fetch,
  port: 3000
});
