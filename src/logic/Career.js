import { League } from './League.js';
import Store from '../data/store.js';
import { TEAMS } from '../data/teams.js?v=2';

export default class Career {
    constructor() {
        this.userTeamId = null;
        this.userTeam = null;
        this.currentSeasonYear = 2024;
        this.leagueA = null; // Primera
        this.leagueB = null; // Nacional B
        this.history = []; // { year: 2024, championA: '...', championB: '...' }
    }

    // Start a fresh career
    start(userTeamId) {
        this.userTeamId = userTeamId;
        this.userTeam = TEAMS.find(t => t.id === userTeamId);
        this.currentSeasonYear = 2024;

        // Logic moved from View: Generate Leagues based on Rating
        const sortedByRating = [...TEAMS].sort((a,b) => b.rating - a.rating);
        let leagueA_Teams = sortedByRating.slice(0, 20);
        let leagueB_Teams = sortedByRating.slice(20, 40);
        
        // Ensure user is in.
        const userInA = leagueA_Teams.find(t => t.id === userTeamId);
        const userInB = leagueB_Teams.find(t => t.id === userTeamId);
        
        if (!userInA && !userInB) {
            // User is in the "left out" group (Tier C). Swap with last of B.
            // But we actually need to put them in B to play.
            leagueB_Teams.pop();
            leagueB_Teams.push(this.userTeam);
        }

        this.leagueA = new League({ 
            name: 'Liga Profesional', 
            level: 1, 
            teams: leagueA_Teams,
            relegationCount: 3 
        });
        this.leagueB = new League({ 
            name: 'Primera Nacional', 
            level: 2, 
            teams: leagueB_Teams,
            promotionCount: 3
        });

        this.leagueA.generateFixture();
        this.leagueB.generateFixture();

        this.save();
    }

    load() {
        const data = Store.load();
        if (!data) return false;

        this.userTeamId = data.userTeamId;
        this.userTeam = TEAMS.find(t => t.id === this.userTeamId);
        this.currentSeasonYear = data.currentSeasonYear;
        this.history = data.history || [];

        // Reconstruct League objects
        this.leagueA = new League({ name: data.leagueA.name, level: 1, teams: data.leagueA.teams });
        this.leagueA.schedule = data.leagueA.schedule;
        this.leagueA.standings = data.leagueA.standings;
        this.leagueA.currentRoundIndex = data.leagueA.currentRoundIndex;

        this.leagueB = new League({ name: data.leagueB.name, level: 2, teams: data.leagueB.teams });
        this.leagueB.schedule = data.leagueB.schedule;
        this.leagueB.standings = data.leagueB.standings;
        this.leagueB.currentRoundIndex = data.leagueB.currentRoundIndex;

        return true;
    }

    save() {
        // Serialize necessary data
        const data = {
            userTeamId: this.userTeamId,
            currentSeasonYear: this.currentSeasonYear,
            history: this.history,
            leagueA: {
                name: this.leagueA.name,
                teams: this.leagueA.teams,
                schedule: this.leagueA.schedule,
                standings: this.leagueA.standings,
                currentRoundIndex: this.leagueA.currentRoundIndex
            },
            leagueB: {
                name: this.leagueB.name,
                teams: this.leagueB.teams,
                schedule: this.leagueB.schedule,
                standings: this.leagueB.standings,
                currentRoundIndex: this.leagueB.currentRoundIndex
            }
        };
        Store.save(data);
    }

    getCurrentUserMatch() {
        if (!this.leagueA || !this.leagueB) return null;
        
        // Find which league the user is in
        const userLeague = this.getUserLeague();
        if(!userLeague) return null;

        const roundMatches = userLeague.schedule[userLeague.currentRoundIndex];
        if (!roundMatches) return null; // Season finished?

        return roundMatches.find(m => m.home.id === this.userTeamId || m.away.id === this.userTeamId);
    }

    getUserLeague() {
        if(this.leagueA.teams.find(t => t.id === this.userTeamId)) return this.leagueA;
        if(this.leagueB.teams.find(t => t.id === this.userTeamId)) return this.leagueB;
        return null;
    }

    // Called when the user plays their match
    // scoreHome/scoreAway are from the actual gameplay result
    advanceWeek(userScoreHome, userScoreAway) {
        const userLeague = this.getUserLeague();
        const otherLeague = userLeague === this.leagueA ? this.leagueB : this.leagueA;

        // 1. Resolve User Match
        const userMatch = this.getCurrentUserMatch();
        if(userMatch) {
            userLeague.playMatch(userMatch, userScoreHome, userScoreAway);
        }

        // 2. Simulate the rest of the user's league for this round
        userLeague.simulateRound(this.userTeamId);
        userLeague.completeRound();

        // 3. Simulate the OTHER league fully for this round (no user there)
        otherLeague.simulateRound('NO_USER'); // Passes dummy ID so all matches are simulated
        otherLeague.completeRound();

        // 4. Save
        this.save();
    }

    isSeasonFinished() {
        return this.leagueA.currentRoundIndex >= this.leagueA.schedule.length;
    }

    endSeason() {
        // 1. Record History
        const champA = this.leagueA.getTopTeams(1)[0];
        const champB = this.leagueB.getTopTeams(1)[0];

        this.history.push({
            year: this.currentSeasonYear,
            championA: champA,
            championB: champB
        });

        // 2. Process Promotion / Relegation
        // Liga A: Bottom 3 descend
        // Liga B: Top 3 ascend
        const relegated = this.leagueA.getBottomTeams(3);
        const promoted = this.leagueB.getTopTeams(3);

        const newLeagueATeams = this.leagueA.teams.filter(t => !relegated.includes(t)).concat(promoted);
        const newLeagueBTeams = this.leagueB.teams.filter(t => !promoted.includes(t)).concat(relegated);

        // 3. Update Ratings
        this.updateRatings(this.leagueA, 1, 3); // Bonus for top, penalty for bottom
        this.updateRatings(this.leagueB, 1, 3);

        // 4. Setup New Season
        this.currentSeasonYear++;
        this.leagueA = new League({ name: 'Liga Profesional', level: 1, teams: newLeagueATeams });
        this.leagueB = new League({ name: 'Primera Nacional', level: 2, teams: newLeagueBTeams });

        this.leagueA.generateFixture();
        this.leagueB.generateFixture();

        this.save();
    }

    updateRatings(league, topCount, bottomCount) {
        // Boost top teams slightly
        const top = league.getTopTeams(topCount);
        top.forEach(t => {
            if(t.rating < 95) t.rating += 1; // Cap at 95
        });

        // Nerf bottom teams slightly
        const bottom = league.getBottomTeams(bottomCount);
        bottom.forEach(t => {
            if(t.rating > 55) t.rating -= 1; // Floor at 55
        });
    }
}
