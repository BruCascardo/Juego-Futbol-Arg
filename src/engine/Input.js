export default class Input {
    constructor() {
        this.keys = {
            ArrowLeft: false,
            ArrowRight: false,
            ArrowUp: false,
            Space: false
        };

        window.addEventListener('keydown', (e) => {
            if (e.code === 'ArrowLeft') this.keys.ArrowLeft = true;
            if (e.code === 'ArrowRight') this.keys.ArrowRight = true;
            if (e.code === 'ArrowUp') this.keys.ArrowUp = true;
            if (e.code === 'Space') this.keys.Space = true;
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft') this.keys.ArrowLeft = false;
            if (e.code === 'ArrowRight') this.keys.ArrowRight = false;
            if (e.code === 'ArrowUp') this.keys.ArrowUp = false;
            if (e.code === 'Space') this.keys.Space = false;
        });
    }

    isDown(key) {
        return this.keys[key];
    }
}
