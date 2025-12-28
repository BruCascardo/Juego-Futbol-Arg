import { Entity, GROUND_Y } from './Entity.js';

export default class Player extends Entity {
    constructor(x, y, color, controls = null, lookDirection = 1) {
        // Cabeza/cuerpo más pequeños
        super(x, y, 25, color);
        this.controls = controls;
        this.elasticity = 0;
        this.friction = 0.85;

        // Velocidad y salto reducidos
        this.speed = 3.5;
        this.jumpForce = -7.0;
        this.isGrounded = false;
        this.facingRight = true;

        this.footAngle = Math.PI / 2.5;
        this.footAngularVelocity = 0;
        this.footRadius = 10;
        this.footDist = 30;

        this.isKicking = false;
        this.kickCooldown = 0;

        this.restAngle = Math.PI / 2.5;
        this.kickAngle = -Math.PI / 4;
        // Disparo algo menos potente
        this.kickSpeed = 10;
        this.lookDirection = lookDirection;

        this.image = new Image();
        this.image.src = 'img/Cabeza.png';

        this.footImage = new Image();
        this.footImage.src = 'img/Botin.png';
    }

    update(input) {
        if (this.controls) {
            if (input.isDown('ArrowLeft')) {
                this.vx = -this.speed;
                this.facingRight = false;
            } else if (input.isDown('ArrowRight')) {
                this.vx = this.speed;
                this.facingRight = true;
            } else {
                this.vx *= 0.8;
            }

            if (input.isDown('ArrowUp') && this.isGrounded) {
                this.vy = this.jumpForce;
                this.isGrounded = false;
            }

            if (input.isDown('Space') && this.kickCooldown <= 0) {
                this.kick();
            }
        }

        super.update();

        if (this.y + this.radius >= GROUND_Y - 1) {
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        this.updateFoot();
    }

    kick() {
        this.isKicking = true;
        this.kickCooldown = 0.4;
    }

    updateFoot() {
        if (this.kickCooldown > 0) this.kickCooldown -= 1 / 60;

        const dt = 1 / 60;
        let target = this.restAngle;
        let speed = 5;

        if (this.isKicking) {
            target = this.kickAngle;
            speed = this.kickSpeed;
            if (Math.abs(this.footAngle - target) < 0.2) {
                this.isKicking = false;
            }
        }

        if (this.footAngle < target) {
            this.footAngle += speed * dt;
            if (this.footAngle > target) this.footAngle = target;
        } else if (this.footAngle > target) {
            this.footAngle -= speed * dt;
            if (this.footAngle < target) this.footAngle = target;
        }

        this.footAngularVelocity = this.isKicking ? -speed : speed;

        let finalAngle = this.footAngle;
        const isMirrored = (this.lookDirection === -1);
        if (isMirrored) {
            finalAngle = Math.PI - this.footAngle;
        }

        this.footX = this.x + Math.cos(finalAngle) * this.footDist;
        this.footY = this.y + Math.sin(finalAngle) * this.footDist;

        let omega = 0;
        if (this.isKicking) omega = -speed;
        if (Math.abs(this.footAngle - target) < 0.01) omega = 0;
        if (isMirrored && this.isKicking) omega = speed;

        const vxTangential = (-Math.sin(finalAngle) * omega * this.footDist) * dt;
        const vyTangential = (Math.cos(finalAngle) * omega * this.footDist) * dt;

        this.footVx = this.vx + vxTangential;
        this.footVy = this.vy + vyTangential;
    }

    updateAI(ball, opponent, ownGoalX) {
        // Determine side based on goal position
        const isRightPlayer = (ownGoalX > 400);
        const defenseSide = isRightPlayer ? 1 : -1;
        
        // Ideal Position: Between Ball and Goal
        const buffer = 40;
        const idealX = ball.x + (buffer * defenseSide); 
        
        let moveDir = 0; 
        if (this.x < idealX - 10) moveDir = 1; 
        else if (this.x > idealX + 10) moveDir = -1; 

        if (moveDir === 1) { this.vx = this.speed; this.facingRight = true; } 
        else if (moveDir === -1) { this.vx = -this.speed; this.facingRight = false; } 
        else { this.vx = 0; }

        // Jump
        if (Math.abs(ball.x - this.x) < 50 && ball.y < this.y - 50 && this.isGrounded) this.vy = this.jumpForce;
        if (this.isGrounded && Math.random() < 0.01) this.vy = this.jumpForce; // Random hop
        
        // Kick
        const dBall = Math.sqrt(Math.pow(ball.x - this.x, 2) + Math.pow(ball.y - this.y, 2));
        let shouldKick = false;
        if (dBall < 60 && this.kickCooldown <= 0) {
            if (isRightPlayer) {
                 if (this.facingRight === false) shouldKick = true;
                 if (ball.x > 700) shouldKick = true; 
            } else {
                 if (this.facingRight === true) shouldKick = true;
                 if (ball.x < 100) shouldKick = true; 
            }
        }
        if (shouldKick && Math.random() < 0.1) this.kick();

        super.update();
        if (this.y + this.radius >= GROUND_Y - 1) { 
            this.isGrounded = true; 
        } else {
            this.isGrounded = false;
        }
        
        this.updateFoot();
    }

    render(ctx) {
        // Draw Foot
        ctx.save();
        ctx.translate(this.footX, this.footY);
        
        let rotation = this.footAngle; 
        if (this.lookDirection === -1) {
            rotation = Math.PI - this.footAngle; 
        }
        
        ctx.rotate(rotation - Math.PI/2); 
        if (this.lookDirection === -1) {
             ctx.scale(-1, 1); 
        }

        if (this.footImage.complete && this.footImage.naturalWidth > 0) {
            const h = this.footRadius * 2.5; 
            const ratio = this.footImage.naturalWidth / this.footImage.naturalHeight;
            const w = h * ratio;
            ctx.drawImage(this.footImage, -w/2, -h/2, w, h);
        } else {
            // Fallback
            ctx.fillStyle = '#111';
            ctx.fillRect(-10, -5, 20, 10);
        }
        ctx.restore();
        
        // Draw Body (Head)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(-this.lookDirection, 1); 
        
        if (this.image.complete && this.image.naturalWidth > 0) {
            const size = this.radius * 2.3; 
            ctx.drawImage(this.image, -size/2, -size/2, size, size);
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
        
        // Marker
        if (this.controls) {
            ctx.save();
            ctx.fillStyle = this.color;
            const indY = this.y - this.radius - 20; 
            ctx.beginPath();
            ctx.moveTo(this.x - 10, indY - 10);
            ctx.lineTo(this.x + 10, indY - 10);
            ctx.lineTo(this.x, indY + 5);
            ctx.fill();
            ctx.restore();
        }
    }
}
