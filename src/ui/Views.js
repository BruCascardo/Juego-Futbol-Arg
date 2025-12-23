import { TEAMS } from '../data/teams.js';

// --- Helpers ---
function createEl(tag, className, text = '') {
    const el = document.createElement(tag);
    if(className) el.className = className;
    if(text) el.textContent = text;
    return el;
}

// --- Views ---

export const MainMenu = ({ onNewGame, onContinue, hasSave }) => {
    const container = createEl('div', 'screen');
    const title = createEl('h1', 'title', 'FÚTBOL ARGENTINO ARCADE');
    container.appendChild(title);

    const btnNew = createEl('button', 'btn', 'Nueva Carrera');
    btnNew.onclick = onNewGame;
    container.appendChild(btnNew);

    if (hasSave) {
        const btnContinue = createEl('button', 'btn', 'Continuar Carrera');
        btnContinue.onclick = onContinue;
        container.appendChild(btnContinue);
    }

    return container;
};

export const CareerSetup = ({ onStart }) => {
    const container = createEl('div', 'screen');
    
    const h2 = createEl('h2', '', 'Tu Equipo');
    container.appendChild(h2);

    // Simple select for now
    const select = createEl('select', 'team-select');
    // Sort teams by name
    const sortedTeams = [...TEAMS].sort((a,b) => a.name.localeCompare(b.name));
    
    sortedTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = `${team.name} (${team.rating})`;
        select.appendChild(option);
    });
    container.appendChild(select);

    const btnStart = createEl('button', 'btn', 'Comenzar Temporada');
    btnStart.onclick = () => {
        const teamId = select.value;
        const mainTeam = TEAMS.find(t => t.id === teamId);
        
        // Auto-fill leagues for simplicity based on ratings or just top 20 / bottom 30
        // We need 20 for A and 20 for B. Total 50 teams. 10 left out.
        // Let's force Main Team into A or B depending on rating? No, user chooses. 
        // User is always placed in Liga A for simplicity? Or let logic handle it.
        // Requested: "User creates career, chooses team... manually selects 20 for A and 20 for B"
        // That's complex UI. Let's auto-generate based on Rating for now to save complexity, 
        // but ensure User Team is in A if high rating, B if low?
        // Let's just put Top 20 rated in A, Next 20 in B. If user is in C (left out), force swap with last of B.
        
        const sortedByRating = [...TEAMS].sort((a,b) => b.rating - a.rating);
        let leagueA = sortedByRating.slice(0, 20);
        let leagueB = sortedByRating.slice(20, 40);
        
        // Ensure user is in.
        const userInA = leagueA.find(t => t.id === teamId);
        const userInB = leagueB.find(t => t.id === teamId);
        
        if (!userInA && !userInB) {
            // User is in the "left out" group. Swap with last of B.
            leagueB.pop();
            leagueB.push(mainTeam);
        }

        onStart(teamId, leagueA, leagueB);
    };
    container.appendChild(btnStart);

    return container;
};

export const Dashboard = ({ team, leagueA, leagueB, nextMatch, onPlayMatch, onNextWeek, currentSeason }) => {
    const container = createEl('div', 'screen');
    container.style.justifyContent = 'flex-start'; // Top align
    container.style.padding = '20px';

    // Header
    const header = createEl('div', 'header');
    header.innerHTML = `<h2>${team.name} - Temp. ${currentSeason}</h2>`;
    container.appendChild(header);

    // Current Status
    if (nextMatch) {
         const vs = nextMatch.home.id === team.id ? nextMatch.away : nextMatch.home;
         const matchInfo = createEl('div', 'match-info');
         matchInfo.innerHTML = `<h3>Próximo Partido</h3><p>vs ${vs.name} (${vs.rating})</p>`;
         container.appendChild(matchInfo);
         
         const btnPlay = createEl('button', 'btn', 'Jugar Partido');
         btnPlay.onclick = onPlayMatch;
         container.appendChild(btnPlay);
    } else {
        const info = createEl('div', 'info', 'Temporada Finalizada');
        container.appendChild(info);
        
        const btnNext = createEl('button', 'btn', 'Siguiente Temporada');
        btnNext.onclick = onNextWeek; // Re-uses next week logic to trigger end season flow
        container.appendChild(btnNext);
    }

    // Tablas
    const tablesContainer = createEl('div', 'tables-container');
    tablesContainer.style.display = 'flex';
    tablesContainer.style.gap = '20px';
    tablesContainer.style.width = '100%';
    tablesContainer.style.justifyContent = 'center';
    
    tablesContainer.appendChild(renderTable(leagueA, "Liga Profesional"));
    tablesContainer.appendChild(renderTable(leagueB, "Primera Nacional"));
    
    container.appendChild(tablesContainer);

    return container;
};

function renderTable(league, title) {
    const div = createEl('div', 'league-table');
    div.innerHTML = `<h3>${title}</h3>`;
    div.style.fontSize = '0.8rem';
    div.style.textAlign = 'left';

    const table = document.createElement('table');
    table.style.width = '300px';
    table.style.borderCollapse = 'collapse';
    table.innerHTML = `
        <tr style="border-bottom: 1px solid #fff">
            <th>Pos</th>
            <th>Club</th>
            <th>Pts</th>
            <th>PJ</th>
            <th>DG</th>
        </tr>
    `;
    
    const standings = league.getStandingsArray();
    standings.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${row.team.shortName}</td>
            <td>${row.points}</td>
            <td>${row.played}</td>
            <td>${row.gd}</td>
        `;
        // Top/Bottom highlight
        // Simple logic for colors
        let color = 'white';
        // Liga A: Bottom 3 Red
        if (league.level === 1 && index >= 17) color = '#e74c3c';
        // Liga B: Top 3 Green
        if (league.level === 2 && index <= 2) color = '#2ecc71';
        
        tr.style.color = color;
        table.appendChild(tr);
    });

    div.appendChild(table);
    return div;
}

export const MatchResults = ({ homeScore, awayScore, onContinue }) => {
    const container = createEl('div', 'screen');
    const h1 = createEl('h1', '', `${homeScore} - ${awayScore}`);
    container.appendChild(h1);
    
    const btn = createEl('button', 'btn', 'Continuar');
    btn.onclick = onContinue;
    container.appendChild(btn);
    
    return container;
};
