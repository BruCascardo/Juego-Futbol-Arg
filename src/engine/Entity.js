export const GRAVITY = 0.5;
export const FRICTION = 0.90;
export const GROUND_Y = 400;

export class Entity {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = radius;
        this.color = color;
        this.mass = 1;
        this.elasticity = 0.6; // Bounciness
        this.friction = 0.90;  // Air/Ground friction
    }

    update() {
        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        // Ground Collision
        if (this.y + this.radius > GROUND_Y) {
            this.y = GROUND_Y - this.radius;
            this.vy *= -this.elasticity; 
            this.vx *= this.friction;
            
            // Stop micro-bouncing
            if(Math.abs(this.vy) < 1) this.vy = 0;
        }

        // Walls
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -0.5;
        }
        if (this.x + this.radius > 800) {
            this.x = 800 - this.radius;
            this.vx *= -0.5;
        }
    }

    render(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}
