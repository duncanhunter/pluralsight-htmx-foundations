window.addEventListener("load", () => {
    const dialogElement = document.getElementById('confirm-dialog');
    let currentConfirmEvent = null;

    document.body.addEventListener("htmx:confirm", (event) => {
        if (!event.target.hasAttribute('hx-confirm')) {
            return
        };

        event.preventDefault();
        currentConfirmEvent = event;
        const question = event.detail.question;
        dialogElement.querySelector('#confirm-message').textContent = question;
        dialogElement.showModal();
    });

    dialogElement.querySelector('#confirm-ok-button').addEventListener('click', () => {
        dialogElement.close();
        if (currentConfirmEvent) {
            currentConfirmEvent.detail.issueRequest(true);
            currentConfirmEvent = null;
        }
    });

    dialogElement.querySelector('#confirm-cancel-button').addEventListener('click', () => {
        dialogElement.close();
        currentConfirmEvent = null;
    });
});