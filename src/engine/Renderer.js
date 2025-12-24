import { GROUND_Y } from './Entity.js';

const GOAL_WIDTH = 60;
const GOAL_HEIGHT = 160;

export default class Renderer {
    constructor(canvas, width, height) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = width;
        this.height = height;

        this.backgroundImage = new Image();
        this.backgroundImage.src = 'img/fondoGameplay.png';
    }

    render(matchScene) {
        // Clear or Draw Background
        if (this.backgroundImage.complete && this.backgroundImage.naturalWidth > 0) {
             this.ctx.drawImage(this.backgroundImage, 0, 0, this.width, this.height);
        } else {
             this.ctx.fillStyle = '#4a6'; 
             this.ctx.fillRect(0, 0, this.width, this.height);
        }
        
        this.drawGoals();
        
        // Interactive Elements
        matchScene.player1.render(this.ctx);
        matchScene.player2.render(this.ctx);
        matchScene.ball.render(this.ctx);
        
        this.drawHUD(matchScene);
        this.drawGoalOverlay(matchScene);
    }

    drawGoals() {
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

        // Crossbars (Vertical posts)
        this.ctx.lineWidth = 5;
        this.ctx.strokeStyle = '#ddd';
        
        // Left Post
        this.ctx.beginPath();
        this.ctx.moveTo(GOAL_WIDTH, GROUND_Y - GOAL_HEIGHT); // Re-calculated locally
        this.ctx.lineTo(GOAL_WIDTH, GROUND_Y);
        this.ctx.stroke();

        // Right Post
        this.ctx.beginPath();
        this.ctx.moveTo(this.width - GOAL_WIDTH, GROUND_Y - GOAL_HEIGHT);
        this.ctx.lineTo(this.width - GOAL_WIDTH, GROUND_Y);
        this.ctx.stroke();
    }

    drawHUD(match) {
        const cx = this.width / 2;
        const cy = 40;
        const boxH = 40;
        
        this.ctx.save();
        
        // Font Settings
        this.ctx.font = 'bold 20px sans-serif';
        this.ctx.textBaseline = 'middle';
        
        // --- HOME (Left) ---
        const wHome = 140;
        const xHome = cx - 10 - wHome; 
        
        // Background
        this.ctx.fillStyle = '#112'; 
        this.ctx.fillRect(xHome, cy - boxH/2, wHome, boxH);
        
        // Color Strip
        this.ctx.fillStyle = match.homeTeam.colors[0];
        this.ctx.fillRect(xHome, cy - boxH/2, 10, boxH);
        this.ctx.fillStyle = match.homeTeam.colors[1] || 'white';
        this.ctx.fillRect(xHome, cy, 10, boxH/2); 
        
        // Name
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(match.homeTeam.shortName, xHome + 20, cy);
        
        // Score
        this.ctx.fillStyle = '#0ff'; // Cyan
        this.ctx.textAlign = 'right';
        this.ctx.fillText(match.score1, xHome + wHome - 15, cy);
        
        // --- AWAY (Right) ---
        const wAway = 140;
        const xAway = cx + 10;
        
        // Background
        this.ctx.fillStyle = '#112';
        this.ctx.fillRect(xAway, cy - boxH/2, wAway, boxH);
        
        // Color Strip (Right Edge)
        this.ctx.fillStyle = match.awayTeam.colors[0];
        this.ctx.fillRect(xAway + wAway - 10, cy - boxH/2, 10, boxH);
        this.ctx.fillStyle = match.awayTeam.colors[1] || 'white';
        this.ctx.fillRect(xAway + wAway - 10, cy, 10, boxH/2);
        
        // Score
        this.ctx.fillStyle = '#0ff';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(match.score2, xAway + 15, cy);
        
        // Name
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(match.awayTeam.shortName, xAway + wAway - 20, cy);
        
        // --- TIME ---
        const xTime = xAway + wAway + 10;
        const wTime = 80;
        
        // Background
        this.ctx.fillStyle = '#ccc';
        this.ctx.fillRect(xTime, cy - boxH/2, wTime, boxH);
        
        // Text
        this.ctx.fillStyle = 'black';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.formatTime(match.timeLeft), xTime + wTime/2, cy);
        
        this.ctx.restore();
    }

    drawGoalOverlay(match) {
        if(match.goalOverlayTimer > 0) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
            this.ctx.fillRect(0,0,this.width, this.height);
            
            this.ctx.textAlign = 'center';

            this.ctx.fillStyle = 'black'; // Shadow/Stroke
            this.ctx.font = 'bold 60px sans-serif';
            this.ctx.fillText("GOL DE", 402, 252);
            this.ctx.fillText(match.lastScorerName.toUpperCase(), 402, 332);
            
            this.ctx.fillStyle = 'gold';
            this.ctx.fillText("GOL DE", 400, 250);
            this.ctx.fillText(match.lastScorerName.toUpperCase(), 400, 330);
        }
    }
    
    formatTime(seconds) {
        if (seconds < 0) seconds = 0;
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
}
