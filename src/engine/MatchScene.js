import Player from './Player.js';
import Ball from './Ball.js';
import Input from './Input.js';
import PhysicsEngine from './Physics.js';
import Renderer from './Renderer.js';
import { GROUND_Y } from './Entity.js';

const GOAL_WIDTH = 60; // Keep for Logic checks if needed, or move to Logic class
const GOAL_HEIGHT = 160;

export default class MatchScene {
    constructor(canvas, homeTeam, awayTeam, onMatchEnd, isPlayerHome = true) {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;
        this.onMatchEnd = onMatchEnd;
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.isPlayerHome = isPlayerHome;
        
        this.lastScorerName = '';

        // Subsystems
        this.physics = new PhysicsEngine(this.width, this.height);
        this.renderer = new Renderer(canvas, this.width, this.height);
        this.input = new Input();

        // Spawn points
        // Player 1 (Home, Left): Controlled if isPlayerHome is true.
        const p1Controls = isPlayerHome ? true : null;
        this.player1 = new Player(150, 300, homeTeam.colors[0], p1Controls, 1); 
        
        // Player 2 (Away, Right): Controlled if isPlayerHome is false.
        const p2Controls = !isPlayerHome ? true : null;
        this.player2 = new Player(650, 300, awayTeam.colors[0], p2Controls, -1);
        this.player2.facingRight = false;

        this.ball = new Ball(400, 200);

        this.score1 = 0;
        this.score2 = 0;
        
        this.timeLeft = 90; 
        this.gameTime = 0;
        this.isRunning = false;
        
        this.goalOverlayTimer = 0;

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
        this.gameTime += dt;
        if(this.gameTime >= 1) {
            this.timeLeft--;
            this.gameTime -= 1;
            if (this.timeLeft <= 0) this.endMatch();
        }
        
        if(this.goalOverlayTimer > 0) {
            this.goalOverlayTimer -= dt;
            if(this.goalOverlayTimer <= 0) this.resetPositions();
            return;
        }

        // Entities Update
        if (this.isPlayerHome) {
            this.player1.update(this.input);
            this.player2.updateAI(this.ball, this.player1, 800); 
        } else {
            this.player1.updateAI(this.ball, this.player2, 0);   
            this.player2.update(this.input);
        }
        
        this.ball.update();

        // Physics Resolution
        this.handleCollisions();
        this.physics.constrainBall(this.ball); 
        
        // Goal Check
        this.checkGoal();
    }

    handleCollisions() {
        // Player vs Player
        this.physics.resolveCircleCollision(this.player1, this.player2, 0.5); 

        // Player 1 Interaction
        this.physics.resolveHeadCollision(this.player1, this.ball);
        this.physics.resolveFootCollision(this.player1, this.ball);
        this.physics.resolveCircleCollision(this.player1, this.ball, 0.3);

        // Player 2 Interaction
        this.physics.resolveHeadCollision(this.player2, this.ball);
        this.physics.resolveFootCollision(this.player2, this.ball);
        this.physics.resolveCircleCollision(this.player2, this.ball, 0.3);

        // Goals Roof Logic (Walls)
        const crossY = GROUND_Y - GOAL_HEIGHT;
        const slope = 5;
        
        // Left Roof
        this.physics.resolveLineCollision(this.ball, -10, crossY, GOAL_WIDTH + 10, crossY + slope + 2);
        
        // Right Roof
        this.physics.resolveLineCollision(this.ball, this.width - GOAL_WIDTH - 10, crossY + slope + 2, this.width + 10, crossY);
        
        // Players Roof Collisions
        this.physics.resolveLineCollision(this.player1, 0, crossY, GOAL_WIDTH, crossY + slope);
        this.physics.resolveLineCollision(this.player1, this.width - GOAL_WIDTH, crossY + slope, this.width, crossY);
        
        this.physics.resolveLineCollision(this.player2, 0, crossY, GOAL_WIDTH, crossY + slope);
        this.physics.resolveLineCollision(this.player2, this.width - GOAL_WIDTH, crossY + slope, this.width, crossY);
    }

    checkGoal() {
        // Goal Line is effectively GOAL_WIDTH (60)
        const crossY = GROUND_Y - GOAL_HEIGHT;
        
        // Left Goal (Player 2 scores)
        if (this.ball.y > crossY && this.ball.x + this.ball.radius < GOAL_WIDTH) {
            this.score2++;
            this.goalOverlayTimer = 2; 
            this.lastScorerName = this.awayTeam.name;
        }

        // Right Goal (Player 1 scores)
         if (this.ball.y > crossY && this.ball.x - this.ball.radius > this.width - GOAL_WIDTH) {
            this.score1++;
            this.goalOverlayTimer = 2; 
            this.lastScorerName = this.homeTeam.name;
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
        this.renderer.render(this);
    }

    endMatch() {
        this.isRunning = false;
        if (this.onMatchEnd) this.onMatchEnd(this.score1, this.score2);
    }
}
