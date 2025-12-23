import { Entity, GROUND_Y } from './Entity.js';

export default class Ball extends Entity {
    constructor(x, y) {
        super(x, y, 14, 'white');
        this.mass = 0.8; // Heavier (was 0.5)
        this.elasticity = 0.5; // Less bounce (was 0.6)
        this.friction = 0.955; // More air drag (was 0.96)
        
        this.angle = 0;
        this.angularVelocity = 0; // Radians per frame
        
        this.image = new Image();
        this.image.src = 'img/Pelota.png';
        this.image.onload = () => console.log("Ball Image Loaded successfully");
        this.image.onerror = (e) => console.error("Error loading Ball Image", e);
    }

    update() {
        // Apply Magnus Effect (Air Curve)
        // Force perpendicular to velocity: F = K * w V_perp
        const K = 0.002; // Strength of curve
        
        // Perpendicular vector to (vx, vy) is (-vy, vx) or (vy, -vx)
        // Coordinate system: Y Down.
        // Backspin (w < 0): Should lift (-Y force). 
        // Forward velocity (vx > 0). vy=0. 
        // F = w * K * V. 
        // If w < 0, vx > 0. We want Fy < 0.
        // If we use (-vy, vx): Fy = K * w * vx = (-) * (+) * (+) = Negative. Correct.
        // Fx = K * w * (-vy).
        
        // Apply Force
        const magX = -this.vy * this.angularVelocity * K;
        const magY = this.vx * this.angularVelocity * K;
        
        this.vx += magX;
        this.vy += magY;
        
        // Air Drag on Spin
        this.angularVelocity *= 0.99;
        this.angle += this.angularVelocity;

        super.update();
        
        // Ceiling override
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
            // Draw Ball Image - Preserving Aspect Ratio
            // To fix "Flattened" look if source image is non-square.
            // Fit the image within a square box of size radius * 2.2 -> User requested Double Size -> 4.4 -> Reduce a bit: 3.3 -> Increase again: 3.8 -> Add +4px (4.1)
            
            const targetSize = this.radius * 4.1; 
            
            const ratio = this.image.naturalWidth / this.image.naturalHeight;
            let drawW = targetSize;
            let drawH = targetSize;
            
            if (ratio > 1) {
                // Wider than tall: match Width, reduce Height
                drawH = targetSize / ratio;
            } else {
                // Taller than wide: match Height, reduce Width
                drawW = targetSize * ratio;
            }
            
            // High Quality Smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            ctx.drawImage(this.image, -drawW/2, -drawH/2, drawW, drawH);
        } else {
            // Fallback Render
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
