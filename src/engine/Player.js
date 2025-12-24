import { Entity, GROUND_Y } from './Entity.js';

export default class Player extends Entity {
    constructor(x, y, color, controls = null, lookDirection = 1) {
        super(x, y, 30, color); 
        this.controls = controls;
        this.elasticity = 0; 
        this.friction = 0.85;
        
        this.speed = 4.5; // Slower pace (was 6)
        this.jumpForce = -8.0; // Target ~64px rise. Top reaches ~124px (3/4 goal).
        this.isGrounded = false;
        this.facingRight = true;

        this.footAngle = Math.PI / 2.5; // Start at rest (down-back)
        this.footAngularVelocity = 0;
        this.footRadius = 12;
        this.footDist = 35;
        
        this.isKicking = false;
        this.kickCooldown = 0;
        
        // Physics for kick
        this.restAngle = Math.PI / 2.5; // ~72 degrees down
        this.kickAngle = -Math.PI / 4; // Reduced to -45 degrees (Halfway up)
        this.kickSpeed = 12; // Tuned for realistic swing speed
        this.lookDirection = lookDirection; // 1 (Right) or -1 (Left)
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
        // Logic handled in updateFoot by state
    }

    updateFoot() {
        if(this.kickCooldown > 0) this.kickCooldown -= 1/60;

        const dt = 1/60;
        
        // Target Angle Logic
        let target = this.restAngle;
        let speed = 5; // Return speed slower
        
        if (this.isKicking) {
            target = this.kickAngle;
            speed = this.kickSpeed; // Use class property (15)
            
            // Check if reached top
            if (Math.abs(this.footAngle - target) < 0.2) {
                this.isKicking = false; // Kick done, return
            }
        }

        // Smoothly move angle towards target
        // Linear approach for snap, or lerp? Linear is better for constant velocity kick.
        if (this.footAngle < target) {
            this.footAngle += speed * dt;
            if (this.footAngle > target) this.footAngle = target;
        } else if (this.footAngle > target) {
            this.footAngle -= speed * dt;
            if (this.footAngle < target) this.footAngle = target;
        }
        
        // Calculate Angular Velocity (approx) for collision physics
        this.footAngularVelocity = (this.isKicking) ? -speed : speed; 
        
        // Orientation adjustment - USE FIX LOOK DIRECTION
        // Player 1 (look=1): Default Right.
        // Player 2 (look=-1): Mirror to Left.
        let finalAngle = this.footAngle;
        let isMirrored = (this.lookDirection === -1);
        
        if (isMirrored) {
             // Mirror: PI - angle
             finalAngle = Math.PI - this.footAngle;
        }

        this.footX = this.x + Math.cos(finalAngle) * this.footDist;
        this.footY = this.y + Math.sin(finalAngle) * this.footDist;
        
        // Calculate Foot World Velocity vector
        let omega = 0;
        if (this.isKicking) omega = -speed; // CCW relative to "Right" model
        
        if (Math.abs(this.footAngle - target) < 0.01) omega = 0;

        // Tangential Logic needs to respect Mirroring
        if (isMirrored) {
             // If mirrored, the visual rotation is reversed? 
             // Angle goes from PI - PI/2.5 (Left-Down) to PI - (-PI/2) (Down? No.)
             // Wait.
             // Rest: PI/2.5 (~72). Kick: -PI/2 (-90).
             // Mirrored Rest: PI - 72 = 108 (Left-Down).
             // Mirrored Kick: PI - (-90) = 270 (-90). Up.
             // So when kicking, angle INCREASES from 108 to 270. (CCW in absolute)
             // But 'omega' as derived from 'speed' was negative (-speed).
             // If we use the exact finalAngle for derivatives, we should be fine?
             
             // Let's use the property that Mirror flips X velocity but keeps Y rotation logic relative?
             // Actually, if we just swap the sign of omega for X component?
             if (this.isKicking) omega = speed; // Kick moves angle POSITIVELY in mirrored space?
             // Let's just trust finalAngle derivative.
             // No, finalAngle is derived.
             
             // Simplest: Inverse Omega for mirrored side?
             if (this.isKicking) omega = speed; 
        }

        // Fix: Convert Pixels/Second to Pixels/Frame by multiplying by dt
        const vxTangential = (-Math.sin(finalAngle) * omega * this.footDist) * dt;
        const vyTangential = (Math.cos(finalAngle) * omega * this.footDist) * dt;
        
        this.footVx = this.vx + vxTangential;
        this.footVy = this.vy + vyTangential;
    }
    
    updateAI(ball, opponent, ownGoalX) {
        // Determine side based on goal position
        // If goal is roughly 0, we are Left Player (Defending Left).
        // If goal is roughly 800, we are Right Player (Defending Right).
        const isRightPlayer = (ownGoalX > 400);
        const defenseSide = isRightPlayer ? 1 : -1; // 1 means Goal is on Right
        
        // Ideal Position: Between Ball and Goal
        // If Right Player: Ball.x + Buffer 
        // If Left Player: Ball.x - Buffer
        const buffer = 40;
        const idealX = ball.x + (buffer * defenseSide); 
        
        let moveDir = 0; 
        if (this.x < idealX - 10) moveDir = 1; 
        else if (this.x > idealX + 10) moveDir = -1; 
        
        // Always face the ball? Or face opponent goal?
        // Usually face opponent goal (Attack dir).
        // If Right Player, Attack Left (MoveDir -1).
        // If Left Player, Attack Right (MoveDir 1).
        // But logic below sets facingRight based on movement?
        // Let's keep movement facing logic.

        if (moveDir === 1) { this.vx = this.speed; this.facingRight = true; } 
        else if (moveDir === -1) { this.vx = -this.speed; this.facingRight = false; } 
        else { this.vx = 0; }

        // Jump if close and ball high?
        if (Math.abs(ball.x - this.x) < 50 && ball.y < this.y - 50 && this.isGrounded) this.vy = this.jumpForce;
        
        // Random Jump
        if (this.isGrounded && Math.random() < 0.01) {
             this.vy = this.jumpForce;
        }
        
        // Panic / Defensive Reaction
        // If Ball is "Behind" me (closer to my goal than me)
        const ballBehind = isRightPlayer ? (ball.x > this.x) : (ball.x < this.x);
        
        if (ballBehind && Math.random() < 0.05) {
             // Move towards ball aggressively (this is covered by idealX logic partially, 
             // but idealX puts us "in front". If behind, idealX pushes us back?)
             // Yes, if ball is 790 and I am 700. Ideal is 830. I run right. Correct.
        }
        
        // Pause
        if (Math.random() < 0.02) {
            this.vx = 0;
        }

        // Jump over opponent?
        if (Math.abs(opponent.x - this.x) < 60 && Math.abs(ball.x - this.x) < 40 && this.isGrounded) {
            if(Math.random()<0.02) this.vy = this.jumpForce;
        }

        const dBall = Math.sqrt(Math.pow(ball.x - this.x, 2) + Math.pow(ball.y - this.y, 2));
        let shouldKick = false;
        if (dBall < 60 && this.kickCooldown <= 0) {
            // Kick if facing correct way (Towards Opponent Goal)
            // Right Player -> Kicks Left (facingRight false)
            // Left Player -> Kicks Right (facingRight true)
            if (isRightPlayer) {
                 if (this.facingRight === false) shouldKick = true;
                 if (ball.x > 700) shouldKick = true; // Clear line
            } else {
                 if (this.facingRight === true) shouldKick = true;
                 if (ball.x < 100) shouldKick = true; // Clear line
            }
        }
        if (shouldKick && Math.random() < 0.1) this.kick();

        super.update();
        if (this.y + this.radius >= GROUND_Y - 1) this.isGrounded = true;
        else this.isGrounded = false;

        this.updateFoot();
    }

    render(ctx) {
        // Draw Foot (Shoe Shape) - "Shark Fin" Ramp ("Aleta de Tiburon")
        ctx.fillStyle = '#111'; 
        ctx.save();
        ctx.translate(this.footX, this.footY);
        
        // Calculate Rotation:
        // footAngle is the "Leg" angle.
        // If Leg is Down (PI/2), Boot point Right (0). 
        // So global rotation = footAngle - PI/2.
        
        // We need 'finalAngle' logic again?
        // 'footAngle' assumes facing Right logic in physics?
        // Let's rely on lookDirection again.
        
        let rotation = this.footAngle; 
        if (this.lookDirection === -1) {
            rotation = Math.PI - this.footAngle; // Recover visual angle for left side
        }
        
        // Align boot to leg
        // If LookDir = 1 (Right):
        // Leg Down ~ 1.5 rad. Boot should be ~0 rad. -> -1.5 offset?
        // Leg Forward (Kick) ~ -0.5 rad. Boot should be ~ -1.5 rad (pointing up)?
        // Wait, if leg is forward, toe points up.
        // So constant offset seems correct.
        
        if (this.lookDirection === 1) {
            // Player 1 (Right) Fix
            // The "Left Side" Logic (else block) used ctx.rotate(rotation - Math.PI/2) and then flipped Y.
            // Our goal is to have the boot perpendicular to the leg.
            // P2 (Left) works. P1 (Right) rotates "nonsense".
            
            // Let's mirror the successful logic of P2 but without flipping scale?
            // "rotation" for P1 is just footAngle.
            // Leg Down = PI/2.
            // Boot should be Flat (0).
            // So Rotation = PI/2 - PI/2 = 0.
            // Kick (Forward) = -0.5. Boot should be -1.5 (Up).
            // Rotation = -0.5 - 1.5 = -2.0.
             
            ctx.rotate(rotation - Math.PI/2); 
            
        } else {
             // Mirror (Player 2)
             // We want horizontal mirroring.
             // Flip X axis to point Left. Keep Y axis (Up/Down) same as P1.
             ctx.rotate(rotation - Math.PI/2);
             ctx.scale(-1, 1); 
        }
        
        // Remove the extra global rotation that was messing things up
        // ctx.rotate(rotation + Math.PI/2);  <-- DELETE THIS 

        // Draw Boot Image
        if (this.footImage.complete && this.footImage.naturalWidth > 0) {
            // Aspect Ratio
            const ratio = this.footImage.naturalWidth / this.footImage.naturalHeight;
            const h = this.footRadius * 2.0; // Height based on radius (approx 24px)
            const w = h * ratio;
            
            // Draw centered on Ankle? 
            // Better: Ankle is usually near the top-back of the boot.
            // If we draw centered (-w/2, -h/2), the ankle is in the middle of the shoe.
            // Let's shift it slightly: 
            // X: Shift drawing left (-w * 0.3) so ankle is at +0.2w (Heel)? No.
            // If drawing at -w/2, center is 0.
            // Let's just center it for now to be safe, user asked to "adapt size".
            
            ctx.drawImage(this.footImage, -w/2, -h/2, w, h);
        } else {
            // Fallback: Shark Fin
            const L = this.footRadius * 2.2; 
            const H = this.footRadius * 1.5; 
            ctx.beginPath();
            ctx.moveTo(-L*0.2, 0);
            ctx.lineTo(L*0.8, 0);
            const heelTopX = -L*0.2;
            const heelTopY = -H * 0.8;
            ctx.quadraticCurveTo(L*0.4, -H*0.1, heelTopX, heelTopY);
            ctx.lineTo(-L*0.2, 0);
            ctx.fill();
        }

        ctx.restore();
        
        // Draw Body (The "Head") using Sprite
        // Image is assumed to face RIGHT by default.
        // We scale based on lookDirection to flip it if needed.
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Flip if looking left
        // Source image faces LEFT apparently based on user feedback.
        // So:
        // lookDirection 1 (Right) -> Scale -1 to flip to Right.
        // lookDirection -1 (Left) -> Scale 1 to keep Left.
        ctx.scale(-this.lookDirection, 1); 
        
        if (this.image.complete && this.image.naturalWidth > 0) {
            // Draw Image
            // Size: radius * 2 = 60.
            // Adjust scale if image has whitespace? Assuming full crop.
            // Using 2.2 * radius to make it slightly larger than hitbox for effect?
            // Or exact 2*radius. Let's start with 2.1x to cover edges.
            const size = this.radius * 2.3; 
            ctx.drawImage(this.image, -size/2, -size/2, size, size);
        } else {
            // Fallback if image not loaded yet
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI*2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // --- SELECTION INDICATOR (FIFA Triangle) ---
        if (this.controls) {
            ctx.save();
            ctx.globalAlpha = 0.7; // Semi-transparent
            ctx.fillStyle = this.color; // Use Team Color
            
            // Triangle pointing down
            // Position: Above head (this.y - radius - offset)
            const indY = this.y - this.radius - 20; 
            const indSize = 10;
            
            ctx.beginPath();
            ctx.moveTo(this.x - indSize, indY - indSize); // Top Left
            ctx.lineTo(this.x + indSize, indY - indSize); // Top Right
            ctx.lineTo(this.x, indY + 5);                 // Bottom Point
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
        
        // Debug Hitbox Visualization (Optional - comment out later)
        // ctx.strokeStyle = 'cyan';
        // ctx.beginPath();
        // ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        // ctx.stroke();
        // Flat Top Limit
        // ctx.beginPath();
        // ctx.moveTo(this.x - 30, this.y - this.radius*0.85);
        // ctx.lineTo(this.x + 30, this.y - this.radius*0.85);
        // ctx.stroke();
        // Nose Center
        // ctx.beginPath();
        // ctx.arc(this.x + (0.6*this.radius*this.lookDirection), this.y, 5, 0, Math.PI*2);
        // ctx.stroke();

    }
}
