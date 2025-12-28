import { Entity, GROUND_Y } from './Entity.js';

export default class Ball extends Entity {
    constructor(x, y) {
        // Bola más pequeña y pesada para jugabilidad lenta
        super(x, y, 7, 'white');
        this.mass = 1.0;
        this.elasticity = 0.75; // Increased bounce
        this.friction = 0.92;

        this.angle = 0;
        this.angularVelocity = 0;

        // Nueva propiedad: velocidad máxima permitida
        this.maxSpeed = 10;

        this.image = new Image();
        this.image.src = 'img/Pelota.png';
        this.image.onload = () => console.log("Ball Image Loaded successfully");
        this.image.onerror = (e) => console.error("Error loading Ball Image", e);
    }

    update() {
        // Apply rotation physics
        this.angularVelocity *= 0.99;
        this.angle += this.angularVelocity;

        // Limitar la velocidad para evitar “tunnelling”
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            const scale = this.maxSpeed / speed;
            this.vx *= scale;
            this.vy *= scale;
        }

        // Movimiento básico
        super.update();

        // Rebote con el techo
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy *= -this.elasticity;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.image.complete && this.image.naturalWidth > 0) {
            const targetSize = this.radius * 4.0;
            const ratio = this.image.naturalWidth / this.image.naturalHeight;
            let drawW = targetSize;
            let drawH = targetSize;
            if (ratio > 1) {
                drawH = targetSize / ratio;
            } else {
                drawW = targetSize * ratio;
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(this.image, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
            // Renderizado de respaldo
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-this.radius, 0);
            ctx.lineTo(this.radius, 0);
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(0, this.radius);
            ctx.stroke();
        }

        ctx.restore();
    }
}
