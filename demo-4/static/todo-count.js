window.addEventListener("load", function () {
    const listElement = document.querySelector('ul');
    const updateCount = () => {
        const count = listElement.querySelectorAll('li').length;
        document.getElementById('todo-count').textContent = count;
    };

    listElement.addEventListener("htmx:afterSettle", updateCount);
    listElement.addEventListener("htmx:afterRequest", updateCount);
});
