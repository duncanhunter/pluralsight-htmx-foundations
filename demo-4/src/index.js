import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import Database from 'better-sqlite3';

const app = new Hono();
const db = new Database('./db/database.sqlite');
const PAGE_SIZE = 10;

app.get('/', async (c) => {
  const page = 1;
  const offset = (page - 1) * PAGE_SIZE;
  const todos = db.prepare("SELECT * FROM todos ORDER BY id DESC LIMIT ? OFFSET ?").all((PAGE_SIZE + 1), offset);

  return c.html(`
    <!DOCTYPE html>
      <html lang="en">
          <head>
              <meta name="viewport" content="width=device-width">
              <meta name="description" content="htmx todos">
              <title>Pluralsight htmx Foundation</title>
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
              <script>
                window.addEventListener("load", () => {
                  const list = document.querySelector('ul');
                  document.addEventListener('htmx:afterRequest', () => {
                    console.log('htmx:afterRequest')
                    const count = list.querySelectorAll('li').length;
                    document.getElementById('todo-count').textContent = count;
                  });

                  document.body.addEventListener("htmx:confirm", ({ target, detail }) => {
                    if (!target.hasAttribute('hx-confirm')) { return };
                    event.preventDefault();

                    const dialog = document.getElementById('nativeConfirmDialog');
                    const question = detail.question || target.getAttribute('hx-confirm');
                    dialog.querySelector('#confirmText').textContent = "Proceed? " + question;

                    dialog.querySelector('#dialogConfirmButton').onclick = () => {
                      dialog.close();
                      detail.issueRequest(true);
                    };

                    dialog.querySelector('#dialogCancelButton').onclick = () => {
                      dialog.close();
                    };

                    dialog.showModal();
                  });
                });
              </script>
          </head>
          <body>
            <input
              type="search"
              name="searchText"
              placeholder="Search todo's"
              hx-post="/search"
              hx-target="next ul"
              hx-indicator=".loading"
              hx-trigger="input changed delay:500ms, keyup[key=='Enter']">
            <form
              hx-indicator=".loading"
              hx-target="next ul"
              hx-swap="afterbegin"
              hx-post="/"
              hx-on::after-request="if(event.detail.successful) this.reset()">
                <input name="name" placeholder="New todo" required autocomplete="off">
                <button type="submit">Add</button>
            </form>
            <div id="error"></div>
            <div><span id="todo-count">${todos.length}</span> items left</div>
            <ul>
                ${todos.map((todo, index) => `
                  <li
                    ${index === PAGE_SIZE ? `
                        hx-get="/todos?page=${page + 1}"
                        hx-trigger="revealed"
                        hx-swap="afterend"
                      ` : ''}
                  >${todo.name}
                    <button
                      hx-indicator=".deleting"
                      hx-target="closest li"
                      hx-swap="outerHTML"
                      hx-delete="/${todo.id}"
                      hx-confirm="Do you really want to delete me">
                        delete
                    </button>
                  </li>
                `).join('')}
                <div class="deleting">deleting...</div>
                <div class="loading">loading...</div>
            </ul>
            <dialog id="nativeConfirmDialog">
              <p id="confirmText">Are you sure?</p>
              <button id="dialogConfirmButton">Yes</button>
              <button id="dialogCancelButton">No</button>
            </dialog>
          </body>
      <html>
  `);
});

app.post("/", async (c) => {
  const { name } = await c.req.parseBody();
  const existingTodo = await db.prepare("SELECT * FROM todos WHERE name = ?").get(name);

  if (existingTodo) {
    return c.html(`
      <div id="error" style="color:red;" hx-swap-oob="true">Todo already exists</div>
    `)
  }

  const { lastInsertRowid } = await db.prepare("INSERT INTO todos (name) VALUES (?)").bind(name).run();

  return c.html(`
    <div id="error" style="color:red;" hx-swap-oob="true"></div>
    <li>${name}
      <button
        hx-target="closest li"
        hx-swap="outerHTML"
        hx-delete="/${lastInsertRowid}"
        hx-confirm="Do you really want to delete me">
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
  const todos = await db.prepare(" SELECT * FROM todos ORDER BY id DESC").all();

  return c.html(todos.length);
})

app.post("/search", async (c) => {
  const { searchText } = await c.req.parseBody();

  const todos = searchText
    ? db
      .prepare("SELECT * FROM todos WHERE name LIKE ?")
      .all(`%${searchText}%`)
    : db.prepare(" SELECT * FROM todos ORDER BY id DESC").all();

  return c.html(`
    ${todos.map(todo => `
        <li>${todo.name}
          <button
            hx-indicator=".deleting"
            hx-target="closest li"
            hx-swap="outerHTML"
            hx-delete="/${todo.id}"
            hx-confirm="Do you really want to delete me">
              delete
          </button>
        </li>
        <div class="deleting">deleting...</div>
        <div class="loading">loading...</div>
      `).join('')}
  `);
});

app.get('/todos', async (c) => {
  const page = parseInt(c.req.query('page'))
  const offset = (page - 1) * (PAGE_SIZE + 1);
  const todos = db.prepare("SELECT * FROM todos ORDER BY id DESC LIMIT ? OFFSET ?").all((PAGE_SIZE + 1), offset);

  const htmlPartial = todos.map((todo, index) => `
    <li
      ${index === PAGE_SIZE ? `
          hx-get="/todos?page=${page + 1}"
          hx-trigger="revealed"
          hx-swap="afterend"
        ` : ''}
    >${todo.name}
      <button
        hx-indicator=".deleting"
        hx-target="closest li"
        hx-swap="outerHTML"
        hx-delete="/${todo.id}"
        hx-confirm="Do you really want to delete me">
          delete
      </button>
    </li>
  `).join('');

  return c.html(htmlPartial, 201, { "HX-Trigger": "todoAdded" });
});

serve({
  fetch: app.fetch,
  port: 4000
});
