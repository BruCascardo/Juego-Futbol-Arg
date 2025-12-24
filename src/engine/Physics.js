import { GROUND_Y } from './Entity.js';

const GOAL_WIDTH = 60;
const GOAL_HEIGHT = 160;

export default class PhysicsEngine {
    constructor(width, height) {
        this.width = width;
        this.height = height;
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
                 // Dampen significantly if pushing DOWN (Player landing on ball)
                 // ny > 0 means normal points from C1 to C2. If C1 is Player (top) and C2 is Ball (bottom), ny is positive (down).
                 let transferFactor = 0.5;
                 if (ny > 0.5 && c1.vy > 0) {
                     // Player falling onto Ball
                     transferFactor = 0.1; // Moderate transfer
                 }
                 
                 c2.vx += c1.vx * transferFactor;
                 c2.vy += c1.vy * transferFactor;
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
            // ... (Existing Ramp Logic) ...
            if (ny < 0) {
                 ny -= 0.5;
                 const len = Math.sqrt(nx*nx + ny*ny);
                 nx /= len;
                 ny /= len;
            }
            
            // --- FEEDBACK: BLOCK FOOT ---
            // If the foot hits the ball, the ball pushes back on the foot.
            // We adjust the footAngle to resolve the overlap "physically" for the foot too.
            // Overlap is linear. Delta Angle ~= Overlap / Radius.
            // We only push back if the foot is moving INTO the ball? 
            // Or just always separate them?
            // Hitting the ball shouldn't instantly stop the foot unless the ball is heavy/blocked.
            // But visually, we want to prevent "ghosting".
            // So we apply a fraction of the overlap as angle correction.
            
            const angleCorrection = (overlap / player.footDist) * 0.8; // 80% correction
            
            // Direction of correction? 
            // If we are Kicking (Angle decreasing/increasing?), we want to oppose movement.
            // But simpliest is: Move foot AWAY from ball.
            // If Ball is "in front" (relative to rotation), move back.
            // If Ball is "behind" (during return), move forward.
            
            // Vector from Pivot(Player) to Ball:
            const dxP = ball.x - player.x;
            const dyP = ball.y - player.y;
            const ballAngle = Math.atan2(dyP, dxP); // Absolute angle
            
            // Player Leg Angle (Absolute)
            // Need to reconstruct the current absolute leg angle from player logic
            // Player.js: 
            // let rotation = this.footAngle; 
            // if (this.lookDirection === -1) rotation = Math.PI - this.footAngle;
            // footX = x + cos(rotation)*dist...
            
            let currentLegAngle = player.footAngle;
            if (player.lookDirection === -1) currentLegAngle = Math.PI - player.footAngle;
            
            // Determine if Ball is "Clockwise" or "CCW" relative to Leg.
            // Simple approach: usage of cross product or simply check if correction reduces overlap.
            
            // Let's just Apply correction opposite to angular velocity?
            // If isKicking (moving up), reduce angle?
            // BUT: Blocking means "Stop".
            // If we just subtract Overlap from position, we stick to surface.
            
            // Let's try: If kicking (or moving), push angle back.
            if (player.isKicking) {
                 // Kicking moves angle towards kickAngle.
                 // We want to fight that.
                 // We simply Clamp the angle? No.
                 
                 // If moving UP (decreasing angle usually? No, check Player.js)
                 // Kick: rest -> kick (-0.5). Angle DECREASES (1.2 -> -0.5).
                 // So if blocked, we INCREASE angle.
                 player.footAngle += angleCorrection;
            } else {
                 // Returning: Angle INCREASES ( -0.5 -> 1.2).
                 // If blocked, we DECREASE angle.
                 player.footAngle -= angleCorrection;
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
            // const dot = ball.vx * nx + ball.vy * ny;
            // ball.vx = (ball.vx - 2 * dot * nx) * 0.8;
            // ball.vy = (ball.vy - 2 * dot * ny) * 0.8;
            
            // Simplified Bounce from MatchScene previous logic if any logic was specific?
            // The original code was:
             const dot = ball.vx * nx + ball.vy * ny;
             ball.vx = (ball.vx - 2 * dot * nx) * 0.8;
             ball.vy = (ball.vy - 2 * dot * ny) * 0.8;
        }
    }

    constrainBall(ball) {
        // General Screen Limits (0 and Width)
        if (ball.x - ball.radius < 0) {
            ball.x = ball.radius;
            ball.vx *= -0.6;
        }
        if (ball.x + ball.radius > this.width) {
            ball.x = this.width - ball.radius;
            ball.vx *= -0.6;
        }
        
        // Ceiling
        if (ball.y < 0) {
             ball.y = ball.radius;
             ball.vy *= -0.5;
        }

        // Floor Clamp (Fix for ball going through floor)
        const floorY = GROUND_Y - ball.radius;
        if (ball.y > floorY) {
            ball.y = floorY;
            ball.vy *= -ball.elasticity;
            // Apply friction if sliding (vx > 0)
            if (Math.abs(ball.vy) < 1) {
                ball.vy = 0;
            }
        }
    }
}
