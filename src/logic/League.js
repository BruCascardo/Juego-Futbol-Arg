export class League {
    constructor(config) {
        this.name = config.name;
        this.level = config.level; // 1 = Primera, 2 = Nacional B
        this.teams = config.teams || []; // Array of team objects
        this.schedule = []; // Array of rounds (Dates)
        this.currentRoundIndex = 0;
        this.standings = {}; // Map teamId -> stats

        this.initStandings();
    }

    initStandings() {
        this.teams.forEach(team => {
            this.standings[team.id] = {
                team: team,
                points: 0,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                gf: 0, // Goals For
                ga: 0, // Goals Against
                gd: 0  // Goal Difference
            };
        });
    }

    // Generate Round Robin Fixture (Ida y Vuelta)
    generateFixture() {
        const teams = [...this.teams];
        const numberOfRounds = (teams.length - 1) * 2;
        const matchesPerRound = teams.length / 2;
        this.schedule = [];

        // Simple Round Robin Algorithm
        // "Home" keeps one team fixed, others rotate.
        // We will create 2 halves: Apertura (One leg) + Clausura (Return leg)
        
        let pool = teams.slice(1);
        let fixedTeam = teams[0];

        // Part 1: First leg
        for (let round = 0; round < teams.length - 1; round++) {
            const roundMatches = [];
            
            // Fixed team match
            // Alternate home/away for fixed team
            if (round % 2 === 0) {
                roundMatches.push({ home: fixedTeam, away: pool[pool.length - 1] });
            } else {
                roundMatches.push({ home: pool[pool.length - 1], away: fixedTeam });
            }

            // Others
            for (let i = 0; i < (teams.length / 2) - 1; i++) {
                const teamA = pool[i];
                const teamB = pool[pool.length - 2 - i];
                if (round % 2 === 0) {
                    roundMatches.push({ home: teamA, away: teamB });
                } else {
                    roundMatches.push({ home: teamB, away: teamA });
                }
            }
            
            this.schedule.push(roundMatches);

            // Rotate pool
            pool.unshift(pool.pop());
        }

        // Part 2: Return leg (invert home/away from Part 1)
        const firstHalf = JSON.parse(JSON.stringify(this.schedule));
        const secondHalf = firstHalf.map(roundMatches => {
            return roundMatches.map(m => ({ home: m.away, away: m.home }));
        });

        this.schedule = [...this.schedule, ...secondHalf];
    }

    playMatch(match, teamAScore, teamBScore) {
        // Record result
        match.played = true;
        match.scoreHome = teamAScore;
        match.scoreAway = teamBScore;

        this.updateStats(match.home.id, teamAScore, teamBScore);
        this.updateStats(match.away.id, teamBScore, teamAScore);
    }

    updateStats(teamId, scored, conceded) {
        const stats = this.standings[teamId];
        stats.played++;
        stats.gf += scored;
        stats.ga += conceded;
        stats.gd = stats.gf - stats.ga;

        if (scored > conceded) {
            stats.won++;
            stats.points += 3;
        } else if (scored === conceded) {
            stats.drawn++;
            stats.points += 1;
        } else {
            stats.lost++;
        }
    }

    simulateRound(userTeamId) {
        if (this.currentRoundIndex >= this.schedule.length) return false;

        const roundMatches = this.schedule[this.currentRoundIndex];
        
        roundMatches.forEach(match => {
            // Do not simulate user's match automatically here (handled separately)
            if (match.home.id === userTeamId || match.away.id === userTeamId) {
                match.isUserMatch = true;
                return; 
            }

            // Simulation Logic based on rating + randomness
            const ratingDiff = match.home.rating - match.away.rating;
            // Base advantage for home team (+3 rating equiv)
            const homeAdvantage = 3; 
            const totalDiff = ratingDiff + homeAdvantage;

            // Simple weighted random
            let homeGoals = 0;
            let awayGoals = 0;

            // Skew goal probability by rating difference
            // If totalDiff is +10 (Home is much better), home gets higher expected goals
            const baseLambda = 1.2; // Avg goals per team
            const lambdaHome = Math.max(0.1, baseLambda + (totalDiff * 0.05));
            const lambdaAway = Math.max(0.1, baseLambda - (totalDiff * 0.05));

            homeGoals = this.poisson(lambdaHome);
            awayGoals = this.poisson(lambdaAway);

            this.playMatch(match, homeGoals, awayGoals);
        });

        return true; // We don't advance round index here, we wait for user match
    }

    // Helper for "random goals"
    poisson(lambda) {
        const limit = Math.exp(-lambda);
        let k = 0;
        let p = 1;
        while (p > limit) {
            k++;
            p *= Math.random();
        }
        return k - 1;
    }

    completeRound() {
        this.currentRoundIndex++;
    }

    getStandingsArray() {
        return Object.values(this.standings).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
        });
    }

    getTopTeams(count) {
        return this.getStandingsArray().slice(0, count).map(s => s.team);
    }

    getBottomTeams(count) {
        return this.getStandingsArray().slice(-count).map(s => s.team);
    }
}
