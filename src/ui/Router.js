export default class Router {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    navigateTo(viewFunc, props = {}) {
        this.container.innerHTML = ''; // Clear current view
        const element = viewFunc(props);
        if (element) {
            this.container.appendChild(element);
        }
    }
    
    clear() {
        this.container.innerHTML = '';
    }
}
