import Player from './Player.js';
import Ball from './Ball.js';
import Input from './Input.js';

const GOAL_WIDTH = 60; // How deep the goal is
const GOAL_HEIGHT = 160;   // Height from ground
const GROUND_Y = 400;

export default class MatchScene {
    constructor(canvas, homeTeam, awayTeam, onMatchEnd) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.onMatchEnd = onMatchEnd;

        this.input = new Input();

        // Spawn points slightly more centered
        // Player 1: Home, Faces Right (1)
        this.player1 = new Player(150, 300, homeTeam.colors[0], true, 1); 
        // Player 2: Away, Faces Left (-1)
        this.player2 = new Player(650, 300, awayTeam.colors[0], null, -1);
        this.player2.facingRight = false;

        this.ball = new Ball(400, 200);

        this.score1 = 0;
        this.score2 = 0;
        
        this.timeLeft = 120; // 2 mins
        this.gameTime = 0;
        this.isRunning = false;
        
        this.goalOverlayTimer = 0;
        
        // Define Crossbars (Static circles)
        // Left Goal: x=60, y = GROUND_Y - GOAL_HEIGHT
        // Right Goal: x=800-60, y = ...
        this.crossbarLeft = { x: GOAL_WIDTH, y: GROUND_Y - GOAL_HEIGHT, radius: 5 };
        this.crossbarRight = { x: this.width - GOAL_WIDTH, y: GROUND_Y - GOAL_HEIGHT, radius: 5 };

        this.start();
    }

    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    loop(timestamp) {
        if (!this.isRunning) return;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        this.update(dt);
        this.render();
        requestAnimationFrame(this.loop.bind(this));
    }

    update(dt) {
        // Time
        // Timer runs EVEN IF scoring (as per user request)
        this.gameTime += dt;
        if(this.gameTime >= 1) {
            this.timeLeft--;
            this.gameTime -= 1;
            if (this.timeLeft <= 0) this.endMatch();
        }
        
        if(this.goalOverlayTimer > 0) {
            this.goalOverlayTimer -= dt;
            if(this.goalOverlayTimer <= 0) this.resetPositions();
            // We do NOT return here, so update continues below?
            // User said "Time must keep running". Usually game pauses during celebration.
            // If we run physics, players might run into walls or ball keeps goals scoring.
            // Let's PAUSE PHYSICS but keep TIMER running.
            return;
        }

        // Updates
        this.player1.update(this.input);
        this.player2.updateAI(this.ball, this.player1);
        this.ball.update();

        // Physics Resolution
        this.handleCollisions();
        this.constrainBall(); // Custom wall logic for goals
        
        // Goal Check
        this.checkGoal();
    }

    handleCollisions() {
        // Player vs Player (Head collision)
        this.resolveCircleCollision(this.player1, this.player2, 0.5); // 0.5 bounciness between players

        // Player 1 Head vs Ball
        this.resolveHeadCollision(this.player1, this.ball);
        // Player 1 Foot vs Ball
        this.resolveFootCollision(this.player1, this.ball);

        // Player 2 Head vs Ball
        this.resolveHeadCollision(this.player2, this.ball);
        // Player 2 Foot vs Ball
        this.resolveFootCollision(this.player2, this.ball);
        
        // Ball vs Crossbars (Posts)
        this.resolveStaticCollision(this.ball, this.crossbarLeft);
        this.resolveStaticCollision(this.ball, this.crossbarRight);
        
        // Goals Roof & Net Logic
        const crossY = GROUND_Y - GOAL_HEIGHT;
        
        // Roof Collisions (Ball AND Players)
        // Left Roof: 0 to 60. Slant upwards towards goal mouth? Or downwards?
        // User said: "Inclinacion para que la pelota no quede atrapada". 
        // If it's flat, ball sits there. If we slant it UP towards field (x=60 is higher than x=0?), ball rolls back to net back?
        // Or slant DOWN towards field (x=60 lower)? Then ball rolls off into field. This is better.
        // Let's make the "Crossbar" end slightly lower than the back.
        // Back: crossY. Front (60): crossY + 5?
        
        const slope = 5;
        // Left: 0, crossY -> 60, crossY + slope
        this.resolveLineCollision(this.ball, 0, crossY, GOAL_WIDTH, crossY + slope);
        
        // Right: Width-60, crossY + slope -> Width, crossY (Mirror)
        this.resolveLineCollision(this.ball, this.width - GOAL_WIDTH, crossY + slope, this.width, crossY);
        
        this.resolveLineCollision(this.player1, 0, crossY, GOAL_WIDTH, crossY + slope);
        this.resolveLineCollision(this.player1, this.width - GOAL_WIDTH, crossY + slope, this.width, crossY);
        
        this.resolveLineCollision(this.player2, 0, crossY, GOAL_WIDTH, crossY + slope);
        this.resolveLineCollision(this.player2, this.width - GOAL_WIDTH, crossY + slope, this.width, crossY);
    }
    
    resolveLineCollision(circle, x1, y1, x2, y2) {
        // Line segment collision
        // Vector L = (x2-x1, y2-y1)
        const lx = x2 - x1;
        const ly = y2 - y1;
        const lenSq = lx*lx + ly*ly;
        
        // Check if circle is within X bounds (plus radius buffer) broadly first
        const minX = Math.min(x1, x2) - circle.radius;
        const maxX = Math.max(x1, x2) + circle.radius;
        if (circle.x < minX || circle.x > maxX) return;

        // Project Circle center onto Line
        // P = (cx-x1, cy-y1)
        const px = circle.x - x1;
        const py = circle.y - y1;
        
        // t = P dot L / lenSq
        let t = (px * lx + py * ly) / lenSq;
        
        // Clamp t to segment [0, 1]
        t = Math.max(0, Math.min(1, t));
        
        // Closest point on line
        const cx = x1 + t * lx;
        const cy = y1 + t * ly;
        
        // Distance
        const distSq = (circle.x - cx)*(circle.x - cx) + (circle.y - cy)*(circle.y - cy);
        
        if (distSq < circle.radius * circle.radius) {
            // Collision
            // Push out along normal
            // Normal is Circle - ClosestPoint
            const dist = Math.sqrt(distSq);
            if (dist === 0) return; // Exact overlap
            
            const nx = (circle.x - cx) / dist;
            const ny = (circle.y - cy) / dist;
            
            const overlap = circle.radius - dist;
            
            // Push out
            circle.x += nx * overlap;
            circle.y += ny * overlap;
            
            // Bounce
            // V dot N
            const dot = circle.vx * nx + circle.vy * ny;
            
            if (dot < 0) {
                 circle.vx -= (1 + 0.5) * dot * nx;
                 circle.vy -= (1 + 0.5) * dot * ny;
                 if(circle.isGrounded !== undefined && ny < -0.5) circle.isGrounded = true; 
            }
        }
    }

    resolveHeadCollision(player, ball) {
        // Sports Heads Style Composite Hitbox - REFINED
        // 1. Flat Top (Balance) - Narrowed
        // 2. Corner Circles (Realistic Deflection)
        // 3. Front Bump (Power Clip)
        // 4. Back Box (Tunneling Prevention)

        const r = player.radius;
        const dir = (player.lookDirection !== undefined) ? player.lookDirection : (player.facingRight ? 1 : -1);

        // --- 1. FLAT TOP (Narrower for Balance only) ---
        // Top relative Y: -0.85r
        const flatTopY = player.y - r * 0.85;
        // Width: Reduced to 0.4r on each side (total 0.8r width) to leave room for corners
        const flatHalfWidth = r * 0.4; 
        
        // 1. BACK BOX (Anti-Tunneling)
        // A rectangle behind the player center.
        // Bounds:
        // Top: Center Y - 0.5r
        // Bottom: Center Y + 0.8r
        // X: From Center to Back limit (-r)
        
        const boxTop = player.y - r * 0.5;
        const boxBottom = player.y + r * 0.8;
        // If facing Right (1), Back is Left (x < Center).
        // If facing Left (-1), Back is Right (x > Center).
        
        // Let's define the "Safety Box" relative position
        // Behind the player, extending outwards
        const backExclusion = r * 0.8; // How far back it goes
        
        // Simple AABB check for tunneling
        let inBackBox = false;
        if (dir === 1) { // Facing Right
             if (ball.x < player.x && ball.x > player.x - backExclusion) inBackBox = true;
        } else { // Facing Left
             if (ball.x > player.x && ball.x < player.x + backExclusion) inBackBox = true;
        }
        
        if (inBackBox && ball.y > boxTop && ball.y < boxBottom) {
             // CAUGHT INSIDE BACK/NECK AREA
             // Eject Horizontally AWAY from face
             // If facing right, eject Left.
             const ejectDir = -dir;
             ball.x = player.x + (backExclusion + ball.radius) * ejectDir;
             ball.vx = player.vx + (200 * ejectDir * 0.016); // push
             return; 
        }

        // --- 2. FLAT TOP ---
        // Check if ball is roughly above the head center and low enough
        if (ball.y + ball.radius > flatTopY && ball.y < flatTopY + ball.radius + 8) {
            // Horizontal check: Strictly within flat width
            if (Math.abs(ball.x - player.x) < flatHalfWidth) {
                if (ball.vy > 0) {
                    ball.y = flatTopY - ball.radius;
                    ball.vy *= -0.5 * ball.elasticity;
                    ball.vx = ball.vx * 0.9 + player.vx * 0.1;
                    if (player.vy < 0) ball.vy += player.vy;
                    return; 
                }
            }
        }

        // --- 3. FRONT BUMP (Nose/Forehead) ---
        const frontX = player.x + (0.6 * r * dir);
        const frontY = player.y - (0.2 * r); 
        const noseR = r * 0.7; 
        
        const dxNose = ball.x - frontX;
        const dyNose = ball.y - player.y; 
        const distNose = Math.sqrt(dxNose*dxNose + dyNose*dyNose);
        const minDistNose = noseR + ball.radius;
        
        if (distNose < minDistNose) {
            const angle = Math.atan2(dyNose, dxNose);
            const overlap = minDistNose - distNose;
            
            ball.x += Math.cos(angle) * overlap;
            ball.y += Math.sin(angle) * overlap;
            
            const nx = Math.cos(angle);
            const ny = Math.sin(angle);
            
            const dvx = ball.vx - player.vx;
            const dvy = ball.vy - player.vy;
            const dot = dvx * nx + dvy * ny;
            
            if (dot < 0) {
                const power = 1.1; 
                ball.vx -= (1 + 0.5) * dot * nx * power;
                ball.vy -= (1 + 0.5) * dot * ny * power;
            }
            return;
        }
        
        // --- 4. CORNERS & BASE ---
        // Instead of a single circle, we now check "Corners" or just fall back to a central circle that handles the curves?
        // The user wants "Realistic curvature" at corners.
        // The Base Circle (radius r at center) provides exactly that curvature for the top corners if we expose them.
        // Since we narrowed the Flat Top (width 0.8r), the "shoulders" of the original circle (radius r) are now exposed.
        // Hitting them effectively is a "Corner Bounce".
        
        // Standard circle collision
        const dx = ball.x - player.x;
        const dy = ball.y - player.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const minDist = r + ball.radius;
        
        if (dist < minDist) {
             const angle = Math.atan2(dy, dx);
             const overlap = minDist - dist;
             
             ball.x += Math.cos(angle) * overlap;
             ball.y += Math.sin(angle) * overlap;
             
             const nx = Math.cos(angle);
             const ny = Math.sin(angle);
             
             const dvx = ball.vx - player.vx;
             const dvy = ball.vy - player.vy;
             const dot = dvx * nx + dvy * ny;
             
             if (dot < 0) {
                 ball.vx -= (1 + 0.5) * dot * nx;
                 ball.vy -= (1 + 0.5) * dot * ny;
             }
        }
    }

    resolveCircleCollision(c1, c2, bounciness = 1.0) {
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const minDist = c1.radius + c2.radius;

        if (dist < minDist) {
            const angle = Math.atan2(dy, dx);
            const overlap = minDist - dist;
            
            // Push apart based on mass? Both equal mass for now (Players)
            // If c2 is Ball (mass < 1), c1 is Player (mass 1).
            // Let's use simple weight: 
            // If c1 is Player and c2 is Player -> Equal split
            // If c1 is Player and c2 is Ball -> Ball moves mostly
            
            // We can detect type by 'mass' property if we set it right, or just hardcode logic.
            // Entity has mass.
            const totalMass = c1.mass + c2.mass;
            const m1Ratio = c2.mass / totalMass; // Inverse ratio for movement
            const m2Ratio = c1.mass / totalMass;
            
            const forceX = Math.cos(angle) * overlap;
            const forceY = Math.sin(angle) * overlap;
            
            c1.x -= forceX * m1Ratio;
            c1.y -= forceY * m1Ratio;
            
            c2.x += forceX * m2Ratio;
            c2.y += forceY * m2Ratio;
            
            // Velocity Exchange (Elastic)
            // Tangent/Normal decomposition... keeping it simple logic for arcade:
            // Just average momentum?
            
            // If Ball (c2) hitting Player (c1):
            // Ball bounces. Player barely feels it (handled by mass ratio movement above).
            // But velocity needs to reflect.
            
            if (c2.mass < c1.mass) {
                 // c2 is lighter (Ball)
                 // Normal Vector
                 const nx = forceX / overlap;
                 const ny = forceY / overlap;
                 
                 // Reflect c2
                 const dot = c2.vx * nx + c2.vy * ny;
                 c2.vx -= (1 + bounciness) * dot * nx;
                 c2.vy -= (1 + bounciness) * dot * ny;
                 
                 // Add c1 velocity kick
                 c2.vx += c1.vx * 0.5;
                 c2.vy += c1.vy * 0.5;
            } else {
                // Player vs Player (Equal mass roughly)
                // Just stop them pushing into each other, friction kills velocity
                // Or bounce slightly
                 const nx = forceX / overlap;
                 const ny = forceY / overlap;
                 const dvx = c2.vx - c1.vx;
                 const dvy = c2.vy - c1.vy;
                 const dot = dvx * nx + dvy * ny;
                 
                 if(dot < 0) { // Moving towards each other
                     const impulse = (1 + bounciness) * dot * 0.5; // Coeff restitution 0.5
                     c1.vx += impulse * nx;
                     c1.vy += impulse * ny;
                     c2.vx -= impulse * nx;
                     c2.vy -= impulse * ny;
                 }
            }
        }
    }

    resolveFootCollision(player, ball) {
        // Foot physics
        // Visual is a "Shark Fin" Ramp.
        // Physics Approximation:
        // 1. Shift the collision circle towards the "Toe" to match the visual length.
        // 2. Bias the collision normal Upwards to simulate the ramp "lifting" the ball.
        
        const r = player.footRadius * 1.5; // Physics Radius
        const dir = (player.lookDirection !== undefined) ? player.lookDirection : (player.facingRight ? 1 : -1);
        
        // Shift center forward to align with Visual Toe
        const footX = player.footX + (r * 0.4 * dir);
        const footY = player.footY; // Keep Y centered or maybe lower?
        
        const dx = ball.x - footX;
        const dy = ball.y - footY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const minDist = r + ball.radius;

        if (dist < minDist) {
            const angle = Math.atan2(dy, dx);
            const overlap = minDist - dist;
            
            ball.x += Math.cos(angle) * overlap;
            ball.y += Math.sin(angle) * overlap;
            
            let nx = Math.cos(angle);
            let ny = Math.sin(angle);
            
            // --- RAMP LIFT LOGIC ---
            // If hitting the top half (ball above foot), simulate the curved ramp.
            // The ramp pushes the ball UP more than a circle would.
            if (ny < 0) {
                 // Bias Normal Upwards
                 // The steeper the bias, the more it lifts.
                 // "Shark Fin" is steep at the back.
                 // Let's negate some X to push it 'back' or just purely relative?
                 // Just adding -0.5 to Y component.
                 ny -= 0.5;
                 
                 // Re-normalize
                 const len = Math.sqrt(nx*nx + ny*ny);
                 nx /= len;
                 ny /= len;
            }
            
            // Physics Kick Calculation
            // ... (Rest same as before)
            
            const dvx = (player.footVx || 0) * 0.7 - ball.vx; 
            const dvy = (player.footVy || 0) * 0.7 - ball.vy;
            
            const dot = dvx * nx + dvy * ny;
            
            if (dot > 0) { // Impacting
                 const bounciness = 0.4; // Less elastic kick
                 const impulse = (1 + bounciness) * dot;
                 
                 // Ball Mass vs Infinite Foot Mass (Foot is driver)
                 ball.vx += impulse * nx;
                 ball.vy += impulse * ny;
                 
                 // --- SPIN / TORQUE ---
                 // Calculate Tangential component of impact
                 // Tangent vector (-ny, nx)
                 const tx = -ny;
                 const ty = nx;
                 const dotTan = dvx * tx + dvy * ty;
                 
                 // Apply Torque
                 // If dvx/dvy (relative velocity) has tangential component, it spins the ball.
                 // Factor 0.05 seems reasonable for "Effect"
                 ball.angularVelocity += dotTan * 0.05; 
            }
        }
    }

    resolveStaticCollision(ball, staticBody) {
        const dx = ball.x - staticBody.x;
        const dy = ball.y - staticBody.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const minDist = ball.radius + staticBody.radius;

        if (dist < minDist) {
            const angle = Math.atan2(dy, dx);
            const overlap = minDist - dist;
            
            ball.x += Math.cos(angle) * overlap;
            ball.y += Math.sin(angle) * overlap;
            
            const nx = Math.cos(angle);
            const ny = Math.sin(angle);
            
            // Reflect
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx = (ball.vx - 2 * dot * nx) * 0.8;
            ball.vy = (ball.vy - 2 * dot * ny) * 0.8;
        }
    }

    constrainBall() {
        const crossY = GROUND_Y - GOAL_HEIGHT;
        
        // --- Custom Goal Constraints ---
        
        // General Screen Limits (0 and 800)
        // If Ball is ABOVE Goal Height (y < crossY), it can go anywhere horizontally until screen edge.
        
        if (this.ball.x - this.ball.radius < 0) {
            // Hits left screen edge
            this.ball.x = this.ball.radius;
            this.ball.vx *= -0.6;
        }
        if (this.ball.x + this.ball.radius > this.width) {
            // Hits right screen edge
            this.ball.x = this.width - this.ball.radius;
            this.ball.vx *= -0.6;
        }
        
        // Inner Net Walls (Back of net) constraint
        // Only if ball is BELOW crossY + some buffer?
        // Actually, if we hit X=0 at Y>CrossY, we handled it above.
        // We need to handle collision with "Outer Side of Net" if ball is in play?
        // No, in Dvadi, the net is just the back wall.
        
        // What prevents ball from entering goal from the SIDE (through the post)?
        // The Post (Static Circle) handles that!
        
        // Only constraint needed:
        // Do NOT let ball roll out of screen at bottom corners? 
        // Logic above "x < 0" handles back of net wall too because back of net IS X=0.
        
        // So actually, the simple screen constraints ARE the back of net constraints!
        // AND they are the high-ball constraints.
        // So this function is actually just screen clamping now.
        // Nice and simple.
        
        // Ceiling
        if (this.ball.y < 0) {
             this.ball.y = this.ball.radius;
             this.ball.vy *= -0.5;
        }

        // Floor Clamp (Fix for ball going through floor)
        // Must be exactly checked against GROUND_Y
        const floorY = GROUND_Y - this.ball.radius;
        if (this.ball.y > floorY) {
            this.ball.y = floorY;
            this.ball.vy *= -this.ball.elasticity;
            // Apply friction if sliding (vx > 0)
            if (Math.abs(this.ball.vy) < 1) {
                this.ball.vy = 0;
            }
        }
    }

    checkGoal() {
        // Goal Line is effectively GOAL_WIDTH (60) and Right Wall - 60.
        // Ball must be fully past line.
        
        const crossY = GROUND_Y - GOAL_HEIGHT;
        
        // Left Goal (Player 2 scores)
        // Must be below crossbar and fully Left of line (x < 60 - radius?)
        if (this.ball.y > crossY && this.ball.x + this.ball.radius < GOAL_WIDTH) {
            this.score2++;
            this.goalOverlayTimer = 2; 
        }

        // Right Goal (Player 1 scores)
         if (this.ball.y > crossY && this.ball.x - this.ball.radius > this.width - GOAL_WIDTH) {
            this.score1++;
            this.goalOverlayTimer = 2; 
        }
    }

    resetPositions() {
        this.ball.x = 400;
        this.ball.y = 200;
        this.ball.vx = 0;
        this.ball.vy = 0;
        
        this.player1.x = 150;
        this.player1.y = 300;
        this.player1.vx = 0;
        this.player1.vy = 0;
        
        this.player2.x = 650;
        this.player2.y = 300;
        this.player2.vx = 0;
        this.player2.vy = 0;
    }

    render() {
        // Background
        this.ctx.fillStyle = '#4a6'; 
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Stadium / Sky visual (Simple)
        this.ctx.fillStyle = '#2c3e50'; 
        this.ctx.fillRect(0, 0, this.width, 100); // Stand
        
        // Draw Goals (Back Net) first
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        // Left Net
        this.ctx.fillRect(0, GROUND_Y - GOAL_HEIGHT, GOAL_WIDTH, GOAL_HEIGHT);
        // Right Net
        this.ctx.fillRect(this.width - GOAL_WIDTH, GROUND_Y - GOAL_HEIGHT, GOAL_WIDTH, GOAL_HEIGHT);

        // Net Roofs (Visual)
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 5;
        
        // Left Roof
        this.ctx.beginPath();
        this.ctx.moveTo(0, GROUND_Y - GOAL_HEIGHT);
        this.ctx.lineTo(GOAL_WIDTH, GROUND_Y - GOAL_HEIGHT);
        this.ctx.stroke();
        
        // Right Roof
        this.ctx.beginPath();
        this.ctx.moveTo(this.width - GOAL_WIDTH, GROUND_Y - GOAL_HEIGHT);
        this.ctx.lineTo(this.width, GROUND_Y - GOAL_HEIGHT);
        this.ctx.stroke();

        // Lines
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 3;
        
        // Pitch Outline
        this.ctx.beginPath();
        // Ground line
        this.ctx.moveTo(0, GROUND_Y);
        this.ctx.lineTo(this.width, GROUND_Y);
        this.ctx.stroke();

        // Halfway
        this.ctx.beginPath();
        this.ctx.moveTo(400, GROUND_Y); // only up to sky?
        this.ctx.lineTo(400, 100);
        this.ctx.stroke();

        // Crossbars (Visual)
        this.ctx.fillStyle = '#ddd';
        
        // Left Post
        this.ctx.beginPath();
        this.ctx.arc(this.crossbarLeft.x, this.crossbarLeft.y, 8, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(this.crossbarLeft.x, this.crossbarLeft.y);
        this.ctx.lineTo(this.crossbarLeft.x, GROUND_Y);
        this.ctx.lineWidth = 5;
        this.ctx.strokeStyle = '#ddd';
        this.ctx.stroke();

        // Right Post
        this.ctx.beginPath();
        this.ctx.arc(this.crossbarRight.x, this.crossbarRight.y, 8, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(this.crossbarRight.x, this.crossbarRight.y);
        this.ctx.lineTo(this.crossbarRight.x, GROUND_Y);
        this.ctx.stroke();

        // Entities
        this.player1.render(this.ctx);
        this.player2.render(this.ctx);
        this.ball.render(this.ctx);
        
        // Forefront HUD
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 40px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.score1} - ${this.score2}`, 400, 60);

        this.ctx.font = '20px sans-serif';
        this.ctx.fillText(`Time: ${Math.floor(this.timeLeft)}`, 400, 90);

        if(this.goalOverlayTimer > 0) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
            this.ctx.fillRect(0,0,this.width, this.height);
            this.ctx.fillStyle = 'gold';
            this.ctx.font = 'bold 80px sans-serif';
            this.ctx.fillText("GOL!", 400, 250);
        }
    }

    endMatch() {
        this.isRunning = false;
        if (this.onMatchEnd) this.onMatchEnd(this.score1, this.score2);
    }
}
