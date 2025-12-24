import Career from '../logic/Career.js';
import Router from '../ui/Router.js';
import * as Views from '../ui/Views.js';
import MatchScene from '../engine/MatchScene.js';
import Store from '../data/store.js';

export default class Game {
    constructor() {
        this.career = new Career();
        this.router = new Router('ui-layer');
        this.canvas = document.getElementById('game-canvas');
        this.matchScene = null;

        this.init();
    }

    init() {
        this.showMainMenu();
    }

    showMainMenu() {
        this.canvas.style.display = 'none'; // Hide canvas
        this.router.navigateTo(Views.MainMenu, {
            onNewGame: () => this.showCareerSetup(),
            onContinue: () => {
                if(this.career.load()) {
                    this.showDashboard();
                }
            },
            hasSave: Store.exists()
        });
    }

    showCareerSetup() {
        this.router.navigateTo(Views.CareerSetup, {
            onStart: (teamId) => {
                this.career.start(teamId);
                this.showDashboard();
            }
        });
    }

    showDashboard() {
        this.canvas.style.display = 'none';
        
        const nextMatch = this.career.getCurrentUserMatch();
        // Determine User League for dashboard view logic
        const userLeague = this.career.getUserLeague();

        this.router.navigateTo(Views.Dashboard, {
            team: this.career.userTeam,
            leagueA: this.career.leagueA,
            leagueB: this.career.leagueB,
            nextMatch: nextMatch,
            currentSeason: this.career.currentSeasonYear,
            onPlayMatch: () => this.startMatch(nextMatch),
            onNextWeek: () => this.nextSeason() // Only called if no match
        });
    }

    startMatch(matchData) {
        this.router.clear(); // Clear UI overlay
        this.canvas.style.display = 'block';

        // Determine Home/Away objects
        // matchData has references to team objects
        const isPlayerHome = (matchData.home.id === this.career.userTeamId);

        this.matchScene = new MatchScene(
            this.canvas,
            matchData.home,
            matchData.away,
            (score1, score2) => this.onMatchEnd(score1, score2, matchData),
            isPlayerHome // New Arguement
        );
    }

    onMatchEnd(score1, score2, matchData) {
        // Stop match scene
        this.matchScene = null;
        this.canvas.style.display = 'none';

        // Update Career
        // Determine who was home/away for user scoring
        // Logic in MatchScene: Player 1 is ALWAYS the "Home" side visual, 
        // but let's assume Player 1 is USER.
        // Wait, matchData.home might be the Rival if User is Away.
        // MatchScene currently sets Player 1 as HomeTeam.colors.
        // We need to ensure we pass the right colors or interpret the score correctly.
        
        // FIX in MatchScene instantiation or here:
        // Let's assume User is ALWAYS Player 1 (Left side) for gameplay simplicity, 
        // but we record stats based on real schedule.
        // If User is Away in schedule, we just swap the "visuals" so user is still left?
        // Or we let user play from Right? Right is harder controls usually.
        // Let's keep User on Left. 
        
        // MAPPING:
        // User = Player 1 (Left). 
        // Rival = Player 2 (Right).
        
        let userScore = score1;
        let rivalScore = score2;
        
        // Apply to Career
        let finalHomeScore, finalAwayScore;
        
        if (matchData.home.id === this.career.userTeamId) {
            finalHomeScore = userScore;
            finalAwayScore = rivalScore;
        } else {
            finalHomeScore = rivalScore; // User was away, so user score (score1) is AwayScore
            finalAwayScore = userScore;
        }

        this.career.advanceWeek(finalHomeScore, finalAwayScore);

        // Show Results
        this.router.navigateTo(Views.MatchResults, {
            homeScore: finalHomeScore,
            awayScore: finalAwayScore,
            onContinue: () => this.showDashboard()
        });
    }

    nextSeason() {
        if(this.career.isSeasonFinished()) {
            this.career.endSeason();
            this.showDashboard();
        }
    }
}
